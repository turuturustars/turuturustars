/**
 * Authentication Service Utilities
 * Core authentication logic and helper functions
 */

import { supabase } from '@/integrations/supabase/client';
import { getEmailConfig } from '@/config/emailConfig';

export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  user_metadata?: Record<string, any>;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  location?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.warn('Failed to check email verification:', error);
      return false;
    }
    
    return !!user?.email_confirmed_at;
  } catch (error) {
    console.error('Email verification check failed:', error);
    return false;
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at || undefined,
      user_metadata: user.user_metadata,
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Sign up new user
 */
export async function signUpUser(data: SignUpData) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        phone: data.phone,
        location: data.location,
      },
      emailRedirectTo: `${globalThis.location?.origin}/profile-setup`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    user: authData.user,
    requiresEmailVerification: !authData.user?.email_confirmed_at,
  };
}

/**
 * Sign in user with email and password
 */
export async function signInUser(data: SignInData) {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    user: authData.user,
    session: authData.session,
  };
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'twitter') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${globalThis.location?.origin}/auth/callback?provider=${provider}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, data };
}

/**
 * Resend email confirmation
 */
export async function resendEmailConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${globalThis.location?.origin}/profile-setup`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, message: 'Confirmation email sent' };
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${globalThis.location?.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, message: 'Password reset email sent' };
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, user: data.user };
}

/**
 * Sign out user
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata: Record<string, any>) {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, user: data.user };
}

/**
 * Change user email
 */
export async function changeUserEmail(newEmail: string) {
  const { data, error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { 
    success: true, 
    user: data.user,
    message: 'Verification link sent to new email address',
  };
}

/**
 * Wait for email verification (polling)
 */
export async function waitForEmailVerification(
  userId: string,
  maxAttempts: number = 12,
  delayMs: number = 5000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const isVerified = await isEmailVerified(userId);
    if (isVerified) {
      return true;
    }

    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

/**
 * Get email configuration for current environment
 */
export function getCurrentEmailConfig() {
  return getEmailConfig();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  isEmailVerified,
  getCurrentUser,
  signUpUser,
  signInUser,
  signInWithOAuth,
  resendEmailConfirmation,
  sendPasswordResetEmail,
  resetPassword,
  signOutUser,
  updateUserMetadata,
  changeUserEmail,
  waitForEmailVerification,
  getCurrentEmailConfig,
  validateEmail,
  validatePassword,
};
