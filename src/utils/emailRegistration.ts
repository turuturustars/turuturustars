/**
 * Email Registration Flow - Best Practices Implementation
 * 
 * This module ensures a complete, production-ready email verification flow
 * for user registration with proper email handling.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Send verification email after user signup
 * Uses Supabase's built-in email verification
 */
export async function sendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // The verification email is automatically sent by Supabase during signUp()
    // This function is for manual resend if needed
    const { error } = await supabase.auth.resendEmailConfirmationMail(email);
    
    if (error) {
      console.error('Email resend error:', error);
      return { success: false, error: error.message };
    }

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
    // Step 1: Create auth account
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation link redirects to this URL
        emailRedirectTo: `${globalThis.location.origin}/auth/confirm`,
        data: {
          // Store profile data in auth metadata for quick access
          full_name: profileData.fullName,
          phone: profileData.phone,
          id_number: profileData.idNumber,
          location: profileData.location,
        },
      },
    });

    if (signupError) {
      console.error('Signup error:', signupError);
      return { success: false, error: signupError.message };
    }

    if (!data.user) {
      return { success: false, error: 'Failed to create account' };
    }

    // Step 2: Verification email is automatically sent by Supabase
    console.log('Verification email sent to:', email);

    // Step 3: Store pending signup info in localStorage for recovery
    try {
      localStorage.setItem('pendingSignup', JSON.stringify({
        email,
        userId: data.user.id,
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Could not save pending signup to localStorage');
    }

    return {
      success: true,
      userId: data.user.id,
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${globalThis.location.origin}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }

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
    const { error } = await supabase.auth.resendEmailConfirmationMail(email);

    if (error) {
      console.error('Resend verification email error:', error);
      return { success: false, error: error.message };
    }

    console.log('Verification email resent to:', email);
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
