import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Mail, Lock } from 'lucide-react';
import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
      isExpired: (widgetId: string) => boolean;
    };
  }
}

interface TurnstileOptions {
  sitekey: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'unsupported-callback'?: () => void;
  appearance?: 'always' | 'execute' | 'interaction-only';
  'auto-reset-on-expire'?: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  captcha?: string;
  submit?: string;
}

interface TurnstileState {
  token: string | null;
  widgetId: string | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// COLOR PALETTE - PRODUCTION COLORS
// ============================================================================

const COLORS = {
  primary: '#00B2E3', // Aqua Blue
  darkBlue: '#003366', // Deep Blue
  softWhite: '#FFFFFF',
  lightGray: '#F0F0F0',
  richBlack: '#1C1C1C',
  accentGreen: '#00CC99',
  crispBlue: '#007BFF',
  deepNavy: '#1A1A2E',
  skyBlue: '#00BFFF',
  lightGrayBg: '#F5F5F5',
  error: '#EF4444',
  success: '#22C55E',
  border: '#E5E7EB',
  textSecondary: '#6B7280',
};

// ============================================================================
// AUTHENTICATION FORM COMPONENT
// ============================================================================

interface AuthenticationFormProps {
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
}

const AuthenticationForm = ({ 
  initialMode = 'login',
  onSuccess 
}: AuthenticationFormProps) => {
  // Navigation and notifications
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Login form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Signup form data
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  /* Turnstile captcha state (disabled)
  // Turnstile captcha state
  const [turnstile, setTurnstile] = useState<TurnstileState>({
    token: null,
    widgetId: null,
    isLoading: false,
    error: null,
  });

  // Refs
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  */

  // Placeholders while Turnstile is disabled to avoid ReferenceErrors
  const loadTurnstileScript = () => {};
  const renderTurnstile = (_el?: HTMLElement) => '' as string;
  const resetTurnstile = () => {};
  const removeTurnstile = () => {};
  const verifyTurnstileToken = async (_token: string): Promise<boolean> => true;

  // =========================================================================
  // TURNSTILE MANAGEMENT
  // =========================================================================

  /*
  Load Turnstile script from CDN (disabled)
  const loadTurnstileScript = useCallback(() => {
    if (scriptLoadedRef.current || window.turnstile) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      console.log('✅ Turnstile script loaded');
    };
    script.onerror = () => {
      console.error('❌ Failed to load Turnstile script');
      setTurnstile((prev) => ({
        ...prev,
        error: 'Failed to load security verification. Please refresh and try again.',
        isLoading: false,
      }));
    };
    document.head.appendChild(script);
  }, []);
  */

  /*
  Render Turnstile widget (disabled)
  const renderTurnstile = useCallback(async () => {
    if (!turnstileContainerRef.current) return;

    // If widget is already rendered, don't render again
    if (turnstile.widgetId) return;

    setTurnstile((prev) => ({ ...prev, isLoading: true }));

    try {
      const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;
      if (!siteKey) {
        throw new Error('Cloudflare site key not configured');
      }

      // Wait for Turnstile to be available
      let attempts = 0;
      const maxAttempts = 50;
      while (!window.turnstile && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.turnstile) {
        throw new Error('Turnstile failed to load');
      }

      // Render the widget
      const widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        appearance: 'managed',
        callback: (token: string) => {
          setTurnstile((prev) => ({
            ...prev,
            token,
            error: null,
            isLoading: false,
          }));
          setErrors((prev) => ({ ...prev, captcha: '' }));
          console.log('✅ Captcha verified');
        },
        'error-callback': () => {
          setTurnstile((prev) => ({
            ...prev,
            token: null,
            error: 'Captcha verification failed. Please try again.',
            isLoading: false,
          }));
          console.error('❌ Captcha error');
        },
        'expired-callback': () => {
          setTurnstile((prev) => ({
            ...prev,
            token: null,
            error: 'Captcha expired. Please verify again.',
            isLoading: false,
          }));
        },
        'timeout-callback': () => {
          setTurnstile((prev) => ({
            ...prev,
            token: null,
            error: 'Captcha timeout. Please try again.',
            isLoading: false,
          }));
        },
        'unsupported-callback': () => {
          console.warn('⚠️ Turnstile not supported in this browser');
          // In unsupported browsers, proceed without captcha
          setTurnstile((prev) => ({
            ...prev,
            token: 'unsupported', // Use special token to indicate unsupported
            isLoading: false,
          }));
        },
      });

      setTurnstile((prev) => ({
        ...prev,
        widgetId,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load captcha';
      console.error('Turnstile error:', err);
      setTurnstile((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [turnstile.widgetId]);
  */

  /* Reset Turnstile widget (disabled)
  const resetTurnstile = useCallback(() => {
    if (!window.turnstile || !turnstile.widgetId) return;

    try {
      window.turnstile.reset(turnstile.widgetId);
      setTurnstile((prev) => ({
        ...prev,
        token: null,
      }));
    } catch (err) {
      console.error('Error resetting Turnstile:', err);
    }
  }, [turnstile.widgetId]);
  */

  /* Remove Turnstile widget (disabled)
  const removeTurnstile = useCallback(() => {
    if (!window.turnstile || !turnstile.widgetId) return;

    try {
      window.turnstile.remove(turnstile.widgetId);
      setTurnstile({
        token: null,
        widgetId: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error removing Turnstile:', err);
    }
  }, [turnstile.widgetId]);
  */

  // =========================================================================
  // LIFECYCLE EFFECTS
  // =========================================================================

  /**
   * Load Turnstile script on mount
   */
  /* Load Turnstile script on mount (disabled)
  useEffect(() => {
    loadTurnstileScript();
  }, [loadTurnstileScript]);
  */

  /**
   * Render/remove Turnstile when mode changes
   */
  /* Render/remove Turnstile when mode changes (disabled)
  useEffect(() => {
    if (mode === 'signup') {
      renderTurnstile();
    } else {
      removeTurnstile();
    }
  }, [mode, renderTurnstile, removeTurnstile]);
  */

  /**
   * Check if already authenticated
   */
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  // =========================================================================
  // FORM VALIDATION
  // =========================================================================

  const validateLogin = (): boolean => {
    try {
      loginSchema.parse(loginData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path as keyof FormErrors] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateSignup = (): boolean => {
    try {
      signupSchema.parse(signupData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path as keyof FormErrors] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // =========================================================================
  // FORM SUBMISSION
  // =========================================================================

  /**
   * Verify Turnstile token with backend
   */
  /* Verify Turnstile token with backend (disabled)
  const verifyTurnstileToken = async (token: string): Promise<boolean> => {
    if (token === 'unsupported') {
      console.warn('Proceeding without Turnstile verification');
      return true;
    }

    try {
      const response = await fetch(
        'https://mkcgkfzltohxagqvsbqk.supabase.co/functions/v1/verify-turnstile',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success === true || data.data?.success === true;
    } catch (err) {
      console.error('Turnstile verification error:', err);
      return false;
    }
  };
  */

  /**
   * Handle login submission
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateLogin()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ submit: 'Invalid email or password' });
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ submit: 'Please check your email to confirm your account' });
        } else {
          setErrors({ submit: error.message || 'Login failed. Please try again.' });
        }
        return;
      }

      toast({
        title: 'Success',
        description: 'You have been signed in successfully',
      });

      // Check if user needs to complete profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, id_number')
          .eq('id', session.user.id)
          .single();

        if (profile?.full_name && profile?.phone && profile?.id_number) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth?mode=complete-profile', { replace: true });
        }
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle signup submission
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateSignup()) return;

    // Signup does not require captcha; create account directly

    setIsLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      });

      if (authError) {
        console.error('Supabase auth.signUp error:', authError);
        if (authError.message.includes('User already registered')) {
          setErrors({ submit: 'This email is already registered. Please log in instead.' });
        } else {
          setErrors({ submit: authError.message || 'Signup failed. Please try again.' });
        }
        resetTurnstile();
        return;
      }

      if (!authData.user) {
        setErrors({ submit: 'Signup failed. Please try again.' });
        resetTurnstile();
        return;
      }

      // Profile is created by the DB trigger on auth.user creation.
      // Avoid inserting here to prevent conflicts when trigger runs.

      toast({
        title: 'Welcome!',
        description: 'Your account has been created. Please check your email to confirm your account.',
      });

      // Reset form and switch to login
      setSignupData({ email: '', password: '', confirmPassword: '' });
      resetTurnstile();
      setMode('login');

      // If a user ID was returned, wait briefly for the profile row (DB trigger)
      try {
        if (authData.user?.id) {
          // import is static at top; use dynamic import to avoid circular issues in some setups
          const { waitForProfile } = await import('@/utils/waitForProfile');
          await waitForProfile(authData.user.id, 5, 400);
        }
      } catch (e) {
        // ignore polling failures; user will be able to complete profile on /register
        // eslint-disable-next-line no-console
        console.warn('Profile polling after signup failed', e);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Google OAuth
   */
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to auth flow so we can check profile completion
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        setErrors({ submit: error.message || 'Google sign in failed' });
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <>
      {/* Dark overlay background */}
      <div
        className="fixed inset-0 z-40"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md"
          style={{
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          <Card
            className="border-0 shadow-2xl"
            style={{
              backgroundColor: COLORS.softWhite,
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <CardHeader
              className="pb-6"
              style={{
                background: `linear-gradient(135deg, ${COLORS.deepNavy} 0%, ${COLORS.darkBlue} 100%)`,
                color: COLORS.softWhite,
              }}
            >
              <CardTitle className="text-2xl font-bold">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </CardTitle>
              <CardDescription
                className="mt-2"
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {mode === 'login'
                  ? 'Welcome back to Turuturu Stars'
                  : 'Join the Turuturu Stars community'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Error message */}
              {errors.submit && (
                <div
                  className="mb-4 p-3 rounded-lg flex items-start gap-3 border"
                  style={{
                    backgroundColor: '#FEE2E2',
                    borderColor: COLORS.error,
                    color: COLORS.richBlack,
                  }}
                >
                  <AlertCircle
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    style={{ color: COLORS.error }}
                  />
                  <p className="text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={mode === 'login' ? handleLogin : handleSignup}
                className="space-y-4"
              >
                {/* Email field */}
                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium"
                    style={{ color: COLORS.richBlack }}
                  >
                    Email Address
                  </Label>
                  <div className="relative mt-1.5">
                    <Mail
                      className="absolute left-3 top-3 h-5 w-5"
                      style={{ color: COLORS.textSecondary }}
                    />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={mode === 'login' ? loginData.email : signupData.email}
                      onChange={(e) => {
                        if (mode === 'login') {
                          setLoginData({ ...loginData, email: e.target.value });
                        } else {
                          setSignupData({ ...signupData, email: e.target.value });
                        }
                        setErrors({ ...errors, email: '', submit: '' });
                      }}
                      disabled={isLoading}
                      className="pl-10"
                      style={{
                        borderColor: errors.email ? COLORS.error : COLORS.border,
                        borderRadius: '8px',
                        padding: '10px 10px 10px 40px',
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p
                      className="mt-1 text-sm"
                      style={{ color: COLORS.error }}
                    >
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium"
                    style={{ color: COLORS.richBlack }}
                  >
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock
                      className="absolute left-3 top-3 h-5 w-5"
                      style={{ color: COLORS.textSecondary }}
                    />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={mode === 'login' ? loginData.password : signupData.password}
                      onChange={(e) => {
                        if (mode === 'login') {
                          setLoginData({ ...loginData, password: e.target.value });
                        } else {
                          setSignupData({ ...signupData, password: e.target.value });
                        }
                        setErrors({ ...errors, password: '', submit: '' });
                      }}
                      disabled={isLoading}
                      className="pl-10 pr-10"
                      style={{
                        borderColor: errors.password ? COLORS.error : COLORS.border,
                        borderRadius: '8px',
                        padding: '10px 40px 10px 40px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3"
                      style={{ color: COLORS.textSecondary }}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      className="mt-1 text-sm"
                      style={{ color: COLORS.error }}
                    >
                      {errors.password}
                    </p>
                  )}
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="mt-2 text-sm"
                      style={{ color: COLORS.primary }}
                      onClick={() => setMode('signup')}
                    >
                      Don't have an account? Sign up
                    </button>
                  )}
                </div>

                {/* Confirm password field (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium"
                      style={{ color: COLORS.richBlack }}
                    >
                      Confirm Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Lock
                        className="absolute left-3 top-3 h-5 w-5"
                        style={{ color: COLORS.textSecondary }}
                      />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) => {
                          setSignupData({
                            ...signupData,
                            confirmPassword: e.target.value,
                          });
                          setErrors({ ...errors, confirmPassword: '', submit: '' });
                        }}
                        disabled={isLoading}
                        className="pl-10 pr-10"
                        style={{
                          borderColor: errors.confirmPassword
                            ? COLORS.error
                            : COLORS.border,
                          borderRadius: '8px',
                          padding: '10px 40px 10px 40px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-3"
                        style={{ color: COLORS.textSecondary }}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p
                        className="mt-1 text-sm"
                        style={{ color: COLORS.error }}
                      >
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {/* Turnstile captcha (signup only) */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <div
                      ref={turnstileContainerRef}
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: COLORS.lightGrayBg,
                        border: `2px solid ${
                          errors.captcha ? COLORS.error : COLORS.border
                        }`,
                      }}
                    />
                    {turnstile.error && (
                      <p
                        className="text-sm flex items-start gap-2"
                        style={{ color: COLORS.error }}
                      >
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {turnstile.error}
                      </p>
                    )}
                    {turnstile.token && turnstile.token !== 'unsupported' && (
                      <p
                        className="text-sm flex items-start gap-2"
                        style={{ color: COLORS.success }}
                      >
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Verified
                      </p>
                    )}
                    {errors.captcha && (
                      <p
                        className="text-sm"
                        style={{ color: COLORS.error }}
                      >
                        {errors.captcha}
                      </p>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 h-11 font-semibold"
                  style={{
                    backgroundColor: COLORS.primary,
                    color: COLORS.deepNavy,
                    borderRadius: '8px',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                    </>
                  ) : mode === 'login' ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div
                    className="absolute inset-0 flex items-center"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <div
                      className="w-full"
                      style={{ borderTop: `1px solid ${COLORS.border}` }}
                    />
                  </div>
                  <div
                    className="relative flex justify-center text-sm"
                    style={{ backgroundColor: COLORS.softWhite }}
                  >
                    <span
                      className="px-2"
                      style={{ color: COLORS.textSecondary }}
                    >
                      or
                    </span>
                  </div>
                </div>

                {/* Google sign in button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-11"
                  style={{
                    borderColor: COLORS.border,
                    color: COLORS.richBlack,
                    borderRadius: '8px',
                  }}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                {/* Toggle mode link */}
                {mode === 'signup' && (
                  <p className="text-center text-sm mt-4">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      style={{ color: COLORS.primary }}
                      className="font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </form>

              {/* Footer */}
              <p
                className="text-center text-xs mt-6"
                style={{ color: COLORS.textSecondary }}
              >
                By signing up, you agree to our{' '}
                <a
                  href="/terms"
                  style={{ color: COLORS.primary }}
                  className="hover:underline"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  style={{ color: COLORS.primary }}
                  className="hover:underline"
                >
                  Privacy Policy
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Input focus states */
        input:focus {
          box-shadow: 0 0 0 3px rgba(0, 178, 227, 0.1) !important;
        }

        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </>
  );
};

export default AuthenticationForm;
