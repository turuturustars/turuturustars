import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  AuthStatus,
  SignOutScope,
  ensureProfileForUser,
  fetchProfile,
  fetchRoles,
  isProfileComplete,
  signOut as supabaseSignOut,
} from './authApi';
import { supabase } from '@/integrations/supabase/client';
import type { ProfileRow, UserRoleRow } from './authApi';
import {
  clearSessionPolicy,
  ensureSessionPolicy,
  getSessionPolicyState,
  SESSION_ACTIVITY_THROTTLE_MS,
  touchSessionActivity,
} from '@/utils/sessionPolicy';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  roles: UserRoleRow['role'][];
  status: AuthStatus;
  refreshProfile: () => Promise<ProfileRow | null>;
  refreshSession: () => Promise<void>;
  signOut: (options?: { scope?: SignOutScope }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_HYDRATION_TIMEOUT_MS = 8000;

const withTimeout = async <T,>(promise: Promise<T>, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${AUTH_HYDRATION_TIMEOUT_MS}ms`));
    }, AUTH_HYDRATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<UserRoleRow['role'][]>([]);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const hydrationRunRef = useRef(0);
  const authEventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setStatus('signed-out');
  }, []);

  const resolveStatus = useCallback(
    (nextUser: User | null, nextProfile: ProfileRow | null) => {
      if (!nextUser) return setStatus('signed-out');
      if (!nextUser.email_confirmed_at) return setStatus('needs-email-verification');
      const profileStatus = nextProfile?.status ?? 'pending';
      if (profileStatus === 'suspended') return setStatus('suspended');
      if (!isProfileComplete(nextProfile)) return setStatus('needs-profile');
      if (profileStatus === 'pending') return setStatus('pending-approval');
      return setStatus('ready');
    },
    []
  );

  const hydrateFromSession = useCallback(
    async (nextSession: Session | null) => {
      const runId = ++hydrationRunRef.current;
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        clearAuthState();
        return;
      }

      const sessionPolicy = ensureSessionPolicy(nextUser.id);
      if (sessionPolicy.expired) {
        clearSessionPolicy(nextUser.id);
        await supabaseSignOut({ scope: 'local' });
        if (!mountedRef.current || runId !== hydrationRunRef.current) return;
        clearAuthState();
        return;
      }

      setStatus('checking');

      const [profileResult, rolesResult] = await Promise.allSettled([
        withTimeout(ensureProfileForUser(nextUser), 'Profile hydration'),
        withTimeout(fetchRoles(nextUser.id), 'Role hydration'),
      ]);

      if (!mountedRef.current || runId !== hydrationRunRef.current) return;

      const nextProfile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const nextRoles = rolesResult.status === 'fulfilled' ? rolesResult.value : [];

      if (profileResult.status === 'rejected') {
        console.warn('Failed to load profile', profileResult.reason);
      }
      if (rolesResult.status === 'rejected') {
        console.warn('Failed to fetch roles', rolesResult.reason);
      }

      setProfile(nextProfile);
      setRoles(nextRoles);
      resolveStatus(nextUser, nextProfile);
    },
    [clearAuthState, resolveStatus]
  );

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth
      .getSession()
      .then(({ data }) => hydrateFromSession(data.session))
      .catch(() => resolveStatus(null, null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (authEventTimerRef.current) {
        clearTimeout(authEventTimerRef.current);
      }

      authEventTimerRef.current = setTimeout(() => {
        authEventTimerRef.current = null;
        void hydrateFromSession(nextSession);
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      hydrationRunRef.current += 1;
      if (authEventTimerRef.current) {
        clearTimeout(authEventTimerRef.current);
        authEventTimerRef.current = null;
      }
      listener.subscription.unsubscribe();
    };
  }, [hydrateFromSession, resolveStatus]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    try {
      const latest = await fetchProfile(user.id);
      if (latest) {
        setProfile(latest);
        resolveStatus(user, latest);
      }
      return latest;
    } catch (error) {
      console.warn('refreshProfile failed', error);
      return null;
    }
  }, [user, resolveStatus]);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('refreshSession failed', error);
      return;
    }
    await hydrateFromSession(data.session);
  }, [hydrateFromSession]);

  const signOut = useCallback(async (options: { scope?: SignOutScope } = {}) => {
    if (user?.id) {
      clearSessionPolicy(user.id);
    }
    await supabaseSignOut({ scope: options.scope ?? 'local' });
    clearAuthState();
  }, [clearAuthState, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastActivityWriteAt = 0;

    const expireSession = () => {
      if (disposed) return;
      void signOut();
    };

    const scheduleExpiryCheck = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const state = getSessionPolicyState(user.id);
      if (state.expired) {
        expireSession();
        return;
      }

      timeoutId = setTimeout(scheduleExpiryCheck, Math.max(1000, state.msUntilExpiry + 250));
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityWriteAt < SESSION_ACTIVITY_THROTTLE_MS) return;

      lastActivityWriteAt = now;
      const state = touchSessionActivity(user.id, now);
      if (state.expired) {
        expireSession();
        return;
      }

      scheduleExpiryCheck();
    };

    const recordVisibleActivity = () => {
      if (document.visibilityState === 'visible') {
        recordActivity();
      }
    };

    ensureSessionPolicy(user.id);
    scheduleExpiryCheck();

    window.addEventListener('pointerdown', recordActivity);
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('scroll', recordActivity, { passive: true });
    window.addEventListener('focus', recordActivity);
    document.addEventListener('visibilitychange', recordVisibleActivity);

    return () => {
      disposed = true;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('scroll', recordActivity);
      window.removeEventListener('focus', recordActivity);
      document.removeEventListener('visibilitychange', recordVisibleActivity);
    };
  }, [signOut, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      roles,
      status,
      refreshProfile,
      refreshSession,
      signOut,
    }),
    [user, session, profile, roles, status, refreshProfile, refreshSession, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
