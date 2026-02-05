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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
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
        photo_url: rawData.photo_url as string | null,
        id_number: rawData.id_number as string | null,
        joined_at: (rawData.joined_at as string) || (rawData.created_at as string),
        location: (rawData.location as string | null) || null,
        occupation: (rawData.occupation as string | null) || null,
      };
      setProfile(profileData);
    }
    setIsLoading(false);
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
    return roles.some((r) => r.role === role);
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
