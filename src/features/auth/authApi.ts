import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { buildSiteUrl } from '@/utils/siteUrl';
import { formatKenyanPhoneError, normalizeKenyanPhone } from '@/utils/kenyanPhone';

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
  phoneVerificationToken?: string;
  idNumber?: string;
  location?: string;
  occupation?: string;
  captchaToken?: string;
}

export interface SignInPayload {
  identifier: string;
  password: string;
  captchaToken?: string;
}

export interface PasswordRecoveryPayload {
  identifier: string;
  captchaToken?: string;
}

export interface PasswordRecoveryResult {
  success: boolean;
  exists: boolean;
  resetSent: boolean;
  message: string;
  emailHint: string | null;
  supportPhone: string;
  identifierType: 'email' | 'membership_number';
}

export interface AuthRequestError extends Error {
  status?: number;
  code?: string;
}

const toAuthRequestError = (error: { message: string; status?: number; code?: string }): AuthRequestError => {
  const authError = new Error(error.message) as AuthRequestError;
  authError.status = error.status;
  authError.code = error.code;
  return authError;
};

export const isProfileComplete = (profile?: Partial<ProfileRow> | null) => {
  if (!profile) return false;
  return Boolean(profile.full_name && profile.phone && profile.id_number);
};

export async function signUpWithEmail(payload: SignUpPayload) {
  const { email, password, captchaToken } = payload;
  const normalizedPhone = payload.phone ? normalizeKenyanPhone(payload.phone) : null;

  if (payload.phone && !normalizedPhone) {
    throw toAuthRequestError({ message: formatKenyanPhoneError(), status: 400, code: 'invalid_phone' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildSiteUrl('/auth/callback'),
      captchaToken,
      data: {
        full_name: payload.fullName,
        phone: normalizedPhone ?? undefined,
        phone_verification_token: payload.phoneVerificationToken,
        id_number: payload.idNumber,
        location: payload.location,
        occupation: payload.occupation,
      },
    },
  });

  if (error) {
    throw toAuthRequestError(error);
  }

  const existingUserHint = Boolean(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);

  return {
    user: data.user,
    requiresEmailVerification: !data.session,
    existingUserHint,
  };
}

export async function signInWithEmail(payload: SignInPayload) {
  const normalizedIdentifier = payload.identifier.trim();
  if (!normalizedIdentifier) {
    throw new Error('Enter your email or phone.');
  }

  const { data, error } = await supabase.functions.invoke('auth-signin', {
    body: {
      identifier: normalizedIdentifier,
      password: payload.password,
      captchaToken: payload.captchaToken,
    },
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  const payloadData = data as {
    success?: boolean;
    error?: string;
    accessToken?: string;
    refreshToken?: string;
    identifierType?: 'email' | 'phone' | 'membership_number';
    usedIdNumberPassword?: boolean;
  };

  if (payloadData.success !== true || !payloadData.accessToken || !payloadData.refreshToken) {
    throw new Error(payloadData.error || 'Unable to sign in');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: payloadData.accessToken,
    refresh_token: payloadData.refreshToken,
  });

  if (sessionError) {
    throw new Error(sessionError.message || 'Unable to start your session.');
  }

  return {
    user: sessionData.user,
    session: sessionData.session,
    identifierType: payloadData.identifierType || 'email',
    usedIdNumberPassword: payloadData.usedIdNumberPassword === true,
  };
}

type SmsVerificationSendResponse = {
  success: true;
  message: string;
  phone: string;
  maskedPhone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  providerMessageId?: string | null;
  providerStatus?: string | null;
};

type SmsVerificationConfirmResponse = {
  success: true;
  message: string;
  phone: string;
  verificationToken: string;
  expiresInSeconds: number;
};

async function extractFunctionError(error: unknown): Promise<string> {
  if (error && typeof error === 'object') {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = (await context.clone().json()) as {
          error?: string;
          details?: { error?: string; message?: string; response?: { message?: string } };
        };
        if (typeof payload.error === 'string' && payload.error.trim()) {
          return payload.error;
        }
        if (payload.details && typeof payload.details.error === 'string' && payload.details.error.trim()) {
          return payload.details.error;
        }
        if (payload.details && typeof payload.details.message === 'string' && payload.details.message.trim()) {
          return payload.details.message;
        }
        if (
          payload.details &&
          payload.details.response &&
          typeof payload.details.response.message === 'string' &&
          payload.details.response.message.trim()
        ) {
          return payload.details.response.message;
        }
      } catch {
        // Fall back to generic message extraction.
      }
    }

    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }

  return 'Request failed';
}

export async function sendSignupSmsCode(phone: string): Promise<SmsVerificationSendResponse> {
  const normalizedPhone = normalizeKenyanPhone(phone);
  if (!normalizedPhone) {
    throw new Error(formatKenyanPhoneError());
  }

  const { data, error } = await supabase.functions.invoke('sms-verify', {
    body: {
      action: 'send',
      purpose: 'signup',
      phone: normalizedPhone,
    },
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  const payload = data as Partial<SmsVerificationSendResponse> & { error?: string };
  if (payload.success !== true) {
    throw new Error(payload.error || 'Failed to send SMS code');
  }

  return payload as SmsVerificationSendResponse;
}

export async function verifySignupSmsCode(phone: string, code: string): Promise<SmsVerificationConfirmResponse> {
  const normalizedPhone = normalizeKenyanPhone(phone);
  if (!normalizedPhone) {
    throw new Error(formatKenyanPhoneError());
  }

  const cleanCode = code.replace(/\D/g, '');
  if (cleanCode.length !== 6) {
    throw new Error('Enter the 6-digit verification code.');
  }

  const { data, error } = await supabase.functions.invoke('sms-verify', {
    body: {
      action: 'verify',
      purpose: 'signup',
      phone: normalizedPhone,
      code: cleanCode,
    },
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  const payload = data as Partial<SmsVerificationConfirmResponse> & { error?: string };
  if (payload.success !== true) {
    throw new Error(payload.error || 'Failed to verify SMS code');
  }

  return payload as SmsVerificationConfirmResponse;
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

export async function requestPasswordResetByIdentifier(
  payload: PasswordRecoveryPayload
): Promise<PasswordRecoveryResult> {
  const { data, error } = await supabase.functions.invoke('auth-recovery', {
    body: {
      identifier: payload.identifier,
      captchaToken: payload.captchaToken,
      redirectTo: buildSiteUrl('/auth/reset-password'),
    },
  });

  if (error) {
    throw new Error(error.message || 'Unable to process password recovery request.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Password recovery service returned an invalid response.');
  }

  const response = data as Partial<PasswordRecoveryResult> & { error?: string };
  if (response.success !== true && response.error) {
    throw new Error(response.error);
  }

  return {
    success: Boolean(response.success),
    exists: Boolean(response.exists),
    resetSent: Boolean(response.resetSent),
    message: response.message || 'Password recovery request processed.',
    emailHint: response.emailHint ?? null,
    supportPhone: response.supportPhone || '0700471113',
    identifierType: response.identifierType === 'membership_number' ? 'membership_number' : 'email',
  };
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

  const normalizedMetaPhone = typeof meta.phone === 'string' ? normalizeKenyanPhone(meta.phone) : null;
  const payload: Partial<ProfileRow> = {
    id: user.id,
    full_name: (meta.full_name as string) || (meta.name as string) || user.email || 'Member',
    phone: normalizedMetaPhone || '',
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

  if (typeof updates.phone === 'string') {
    const normalizedPhone = normalizeKenyanPhone(updates.phone);
    if (!normalizedPhone) {
      throw toAuthRequestError({ message: formatKenyanPhoneError(), status: 400, code: 'invalid_phone' });
    }
    payload.phone = normalizedPhone;
  }

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
