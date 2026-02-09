import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  AuthStatus,
  ensureProfileForUser,
  fetchProfile,
  fetchRoles,
  isProfileComplete,
  signOut as supabaseSignOut,
} from './authApi';
import { supabase } from '@/integrations/supabase/client';
import type { ProfileRow, UserRoleRow } from './authApi';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  roles: UserRoleRow['role'][];
  status: AuthStatus;
  refreshProfile: () => Promise<ProfileRow | null>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<UserRoleRow['role'][]>([]);
  const [status, setStatus] = useState<AuthStatus>('checking');

  const resolveStatus = useCallback(
    (nextUser: User | null, nextProfile: ProfileRow | null) => {
      if (!nextUser) return setStatus('signed-out');
      if (!nextUser.email_confirmed_at) return setStatus('needs-email-verification');
      if (!isProfileComplete(nextProfile)) return setStatus('needs-profile');
      return setStatus('ready');
    },
    []
  );

  const loadProfile = useCallback(
    async (currentUser: User) => {
      try {
        const ensured = await ensureProfileForUser(currentUser);
        setProfile(ensured);
        resolveStatus(currentUser, ensured);
        return ensured;
      } catch (error) {
        console.warn('Failed to load profile', error);
        resolveStatus(currentUser, null);
        return null;
      }
    },
    [resolveStatus]
  );

  const loadRoles = useCallback(async (userId: string) => {
    try {
      const nextRoles = await fetchRoles(userId);
      setRoles(nextRoles);
    } catch (error) {
      console.warn('Failed to fetch roles', error);
    }
  }, []);

  const hydrateFromSession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setRoles([]);
        resolveStatus(null, null);
        return;
      }

      await Promise.all([loadProfile(nextUser), loadRoles(nextUser.id)]);
    },
    [loadProfile, loadRoles, resolveStatus]
  );

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => hydrateFromSession(data.session))
      .catch(() => resolveStatus(null, null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrateFromSession(nextSession);
    });

    return () => {
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

  const signOut = useCallback(async () => {
    await supabaseSignOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setStatus('signed-out');
  }, []);

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
