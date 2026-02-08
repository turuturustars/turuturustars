import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  membership_number: string | null;
  status: 'active' | 'dormant' | 'pending' | 'suspended';
  is_student: boolean;
  registration_fee_paid: boolean;
  membership_fee_amount: number | null;
  membership_fee_paid: boolean;
  photo_url: string | null;
  id_number: string | null;
  joined_at: string;
  location: string | null;
  occupation: string | null;
}

interface UserRole {
  role:
    | 'admin'
    | 'treasurer'
    | 'secretary'
    | 'chairperson'
    | 'vice_chairman'
    | 'vice_secretary'
    | 'organizing_secretary'
    | 'committee_member'
    | 'patron'
    | 'coordinator'
    | 'member';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const purgeSupabaseStorage = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to purge Supabase storage:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 4000);

    const validateCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          purgeSupabaseStorage();
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
        }
      } catch (error) {
        purgeSupabaseStorage();
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        setTimeout(() => {
          fetchProfileWithRetry(session.user.id);
          fetchRoles(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error fetching session:', error);
          purgeSupabaseStorage();
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (session?.user) {
          validateCurrentUser();
          fetchProfileWithRetry(session.user.id);
          fetchRoles(session.user.id);
        }
      })
      .catch((error) => {
        console.error('Unexpected error fetching session:', error);
        purgeSupabaseStorage();
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const generateMembershipNumber = async (): Promise<string | null> => {
    try {
      const { data, error } = await (supabase as any).rpc('generate_membership_number');
      if (error) {
        console.warn('Failed to generate membership number:', error);
        return null;
      }
      if (typeof data === 'string' && data.trim()) {
        return data;
      }
      return null;
    } catch (error) {
      console.warn('Failed to generate membership number:', error);
      return null;
    }
  };

  const ensureProfileFromAuth = async (authUser: User) => {
    const metadata = (authUser.user_metadata || {}) as Record<string, unknown>;
    const fullName = String(metadata.full_name || '').trim() || 'Member';
    const phone = String(metadata.phone || '').trim();
    const idNumber = String(metadata.id_number || '').trim();
    const location = String(metadata.location || '').trim();
    const occupation = String(metadata.occupation || '').trim();

    const membershipNumber = await generateMembershipNumber();

    const payload: Record<string, unknown> = {
      id: authUser.id,
      full_name: fullName,
      phone: phone || '0000000000',
      email: authUser.email || null,
      id_number: idNumber || null,
      location: location || null,
      occupation: occupation || null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    };

    if (membershipNumber) {
      payload.membership_number = membershipNumber;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(payload as any, { onConflict: 'id' });

    if (error) {
      console.warn('Failed to ensure profile exists:', error);
    }
  };

  const backfillMembershipNumber = async (userId: string) => {
    const membershipNumber = await generateMembershipNumber();
    if (!membershipNumber) return;
    const { error } = await supabase
      .from('profiles')
      .update({ membership_number: membershipNumber, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .is('membership_number', null);

    if (error) {
      console.warn('Failed to backfill membership number:', error);
    }
  };

  const fetchProfile = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      // Cast to any to access new columns that may not be in generated types yet
      const rawData = data as Record<string, unknown>;
      const profileData: Profile = {
        id: rawData.id as string,
        full_name: rawData.full_name as string,
        phone: rawData.phone as string,
        email: rawData.email as string | null,
        membership_number: rawData.membership_number as string | null,
        status: (rawData.status as Profile['status']) || 'pending',
        is_student: (rawData.is_student as boolean) || false,
        registration_fee_paid: (rawData.registration_fee_paid as boolean) || false,
        membership_fee_amount: (rawData.membership_fee_amount as number | null) ?? null,
        membership_fee_paid: (rawData.membership_fee_paid as boolean) || false,
        photo_url: rawData.photo_url as string | null,
        id_number: rawData.id_number as string | null,
        joined_at: (rawData.joined_at as string) || (rawData.created_at as string),
        location: (rawData.location as string | null) || null,
        occupation: (rawData.occupation as string | null) || null,
      };
      setProfile(profileData);
      setIsLoading(false);
      if (!profileData.membership_number) {
        backfillMembershipNumber(userId);
      }
      if (!profileData.registration_fee_paid) {
        reconcileRegistrationFeePaid(userId);
      }
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const reconcileRegistrationFeePaid = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select('id')
        .eq('member_id', userId)
        .eq('contribution_type', 'membership_fee')
        .eq('status', 'paid')
        .limit(1);

      if (error) {
        console.warn('Failed to check registration fee status:', error);
        return;
      }

      if (data && data.length > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            registration_fee_paid: true,
            membership_fee_paid: true,
            membership_fee_paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .eq('registration_fee_paid', false);

        if (updateError) {
          console.warn('Failed to update registration fee status:', updateError);
        }
      }
    } catch (error) {
      console.warn('Registration fee reconciliation error:', error);
    }
  };

  
  const fetchProfileWithRetry = async (userId: string, attempts: number = 4, delayMs: number = 400) => {
    const authUser = session?.user || user;
    for (let i = 0; i < attempts; i++) {
      const found = await fetchProfile(userId);
      if (found) return;
      if (i === 0 && authUser) {
        await ensureProfileFromAuth(authUser);
      }
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!error && data) {
      setRoles(data as UserRole[]);
    }
  };

  const hasRole = (role: string) => {
    return roles.some((r) => r.role === role || r.role === 'admin');
  };

  const isOfficial = () => {
    return roles.some((r) => 
      ['admin', 'treasurer', 'secretary', 'chairperson', 'vice_chairman', 'vice_secretary', 'organizing_secretary', 'committee_member', 'patron', 'coordinator'].includes(r.role)
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  return {
    user,
    session,
    profile,
    roles,
    isLoading,
    hasRole,
    isOfficial,
    signOut,
  };
}


