import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { buildSiteUrl } from '@/utils/siteUrl';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];

export type AuthStatus =
  | 'checking'
  | 'signed-out'
  | 'needs-email-verification'
  | 'needs-profile'
  | 'pending-approval'
  | 'suspended'
  | 'ready';

export interface SignUpPayload {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  idNumber?: string;
  location?: string;
  occupation?: string;
  captchaToken?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
  captchaToken?: string;
}

export const isProfileComplete = (profile?: Partial<ProfileRow> | null) => {
  if (!profile) return false;
  return Boolean(profile.full_name && profile.phone && profile.id_number);
};

export async function signUpWithEmail(payload: SignUpPayload) {
  const { email, password, captchaToken } = payload;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildSiteUrl('/auth/callback'),
      captchaToken,
      data: {
        full_name: payload.fullName,
        phone: payload.phone,
        id_number: payload.idNumber,
        location: payload.location,
        occupation: payload.occupation,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    requiresEmailVerification: !data.session,
  };
}

export async function signInWithEmail(payload: SignInPayload) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
    options: {
      captchaToken: payload.captchaToken,
    },
  });

  if (error) throw new Error(error.message);
  return { user: data.user, session: data.session };
}

export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: buildSiteUrl('/auth/callback') },
  });

  if (error) throw new Error(error.message);
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildSiteUrl('/auth/reset-password'),
  });
  if (error) throw new Error(error.message);
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data as ProfileRow | null;
}

export async function generateMembershipNumber() {
  try {
    const { data, error } = await (supabase as any).rpc('generate_membership_number');
    if (error) return null;
    if (typeof data === 'string' && data.trim()) return data;
    return null;
  } catch {
    return null;
  }
}

export async function ensureProfileForUser(user: User) {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const membershipNumber = await generateMembershipNumber();
  const meta = (user.user_metadata || {}) as Record<string, unknown>;

  const payload: Partial<ProfileRow> = {
    id: user.id,
    full_name: (meta.full_name as string) || (meta.name as string) || user.email || 'Member',
    phone: (meta.phone as string) || null,
    email: user.email,
    id_number: (meta.id_number as string) || null,
    location: (meta.location as string) || null,
    occupation: (meta.occupation as string) || null,
    status: 'pending',
    membership_number: membershipNumber ?? undefined,
    updated_at: new Date().toISOString(),
  };

  await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  return fetchProfile(user.id);
}

export async function updateProfile(userId: string, updates: Partial<ProfileRow>) {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow;
}

export async function fetchRoles(userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((r) => r.role) as UserRoleRow['role'][];
}

export async function signOut() {
  await supabase.auth.signOut();
}
