/**
 * Email Registration Flow - Best Practices Implementation
 * 
 * This module ensures a complete, production-ready email verification flow
 * for user registration with proper email handling.
 */

import { supabase } from '@/integrations/supabase/client';
import { buildSiteUrl } from '@/utils/siteUrl';
import {
  registerWithEmail,
  resendVerificationEmail as resendVerificationEmailFromAuth,
  sendPasswordResetEmail as sendPasswordResetViaAuthService,
} from '@/lib/authService';

/**
 * Send verification email after user signup
 * Uses Supabase's built-in email verification
 */
export async function sendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await resendVerificationEmailFromAuth(email, buildSiteUrl('/auth/confirm'));
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to resend email';
    console.error('Resend email error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Best practices signup flow:
 * 1. Create auth account
 * 2. Send verification email (automatic)
 * 3. User verifies email
 * 4. Create/update profile
 * 5. Redirect to dashboard
 */
export async function signupWithEmailVerification(
  email: string,
  password: string,
  profileData: {
    fullName: string;
    phone: string;
    idNumber: string;
    location: string;
  }
): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
  message?: string;
}> {
  try {
    const response = await registerWithEmail({
      email,
      password,
      fullName: profileData.fullName,
      phone: profileData.phone,
      idNumber: profileData.idNumber,
      location: profileData.location,
      redirectTo: buildSiteUrl('/auth/confirm'),
    });

    // Step 3: Store pending signup info in localStorage for recovery
    try {
      localStorage.setItem('pendingSignup', JSON.stringify({
        email,
        userId: response.userId,
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Could not save pending signup to localStorage');
    }

    return {
      success: true,
      userId: response.userId,
      message: 'Account created! Check your email to verify your account.',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Signup failed';
    console.error('Signup error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Verify email confirmation and complete profile
 * Called after user clicks email confirmation link
 */
export async function verifyEmailAndCompleteProfile(
  userId: string,
  profileData: {
    fullName: string;
    phone: string;
    idNumber: string;
    location: string;
    occupation?: string;
    isStudent?: boolean;
  }
): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    // Step 1: Check if email is verified
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User session not found' };
    }

    if (!user.email_confirmed_at) {
      return { 
        success: false, 
        error: 'Email not verified yet. Please check your email for the confirmation link.' 
      };
    }

    // Step 2: Create/update profile with verified data
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: profileData.fullName,
        phone: profileData.phone,
        id_number: profileData.idNumber,
        email: user.email,
        location: profileData.location,
        occupation: profileData.occupation || null,
        is_student: profileData.isStudent || false,
        status: 'active',
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return { success: false, error: profileError.message };
    }

    // Step 3: Clean up pending signup from localStorage
    try {
      localStorage.removeItem('pendingSignup');
    } catch (e) {
      console.warn('Could not remove pending signup from localStorage');
    }

    return {
      success: true,
      message: 'Email verified and profile created successfully!',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Verification failed';
    console.error('Email verification error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetViaAuthService(email);

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to send reset email';
    console.error('Password reset error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Resend verification email
 * Call this if user didn't receive the initial email
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await resendVerificationEmailFromAuth(email, buildSiteUrl('/auth/confirm'));
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to resend email';
    console.error('Resend error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Check if email is verified
 */
export async function isEmailVerified(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }

    return !!user.email_confirmed_at;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
}

/**
 * Get pending signup info from localStorage
 */
export function getPendingSignup(): { email?: string; userId?: string; timestamp?: string } | null {
  try {
    const pending = localStorage.getItem('pendingSignup');
    return pending ? JSON.parse(pending) : null;
  } catch (e) {
    console.warn('Could not read pending signup from localStorage');
    return null;
  }
}

/**
 * Clear pending signup info
 */
export function clearPendingSignup(): void {
  try {
    localStorage.removeItem('pendingSignup');
  } catch (e) {
    console.warn('Could not clear pending signup');
  }
}
