import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateRequestId } from '@/utils/requestId';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { usePageMeta } from '@/hooks/usePageMeta';
import ForgotPassword from '@/components/ForgotPassword';
import turuturuLogo from '@/assets/turuturustarslogo.png';
/* Captcha integration (disabled for now)
import { useCaptcha } from '@/hooks/useCaptcha';
*/

// Login schema only
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Auth Page - Login Only
 * 
 * This page handles authentication (login).
 * For registration, users are directed to /register
 * which provides an engaging, step-by-step registration experience.
 */
const Auth = () => {
  usePageMeta({
    title: 'Sign In - Turuturu Stars CBO',
    description: 'Sign in to your Turuturu Stars Community account to access your member dashboard, manage contributions, and participate in community activities.',
    keywords: ['login', 'sign in', 'member portal', 'Turuturu Stars'],
    canonicalUrl: 'https://turuturustars.co.ke/auth',
    robots: 'index,follow'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  /* Captcha integration (temporarily commented out)
    const { captchaToken, renderCaptcha, resetCaptcha, removeCaptcha, error: captchaError } = useCaptcha();
    */
  // Placeholders while captcha is disabled to avoid ReferenceErrors
  const captchaToken = null as string | null;
  const renderCaptcha = (_containerId?: string) => {};
  const resetCaptcha = (_containerId?: string) => {};
  const removeCaptcha = (_containerId?: string) => {};
  const captchaError = null as string | null;
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    // Check URL params for signup mode
    if (searchParams.get('mode') === 'signup') {
      setIsSignup(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

  /* Captcha management (disabled)
  useEffect(() => {
    if (!isForgotPassword) {
      const timer = setTimeout(() => {
        renderCaptcha('captcha-container');
      }, 100);
      return () => clearTimeout(timer);
    } else {
      removeCaptcha('captcha-container');
    }
  }, [isForgotPassword, renderCaptcha, removeCaptcha]);
  */

  const validateForm = () => {
    try {
      loginSchema.parse({ email: formData.email, password: formData.password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to auth flow so profile completion can be enforced
          redirectTo: `${globalThis.location.origin}/auth`,
        },
      });

      if (error) {
        toast({
          title: 'Sign In Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: 'Sign In Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Removed captcha from signup flow
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate signup form
    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      setErrors({
        email: !signupData.email ? 'Email is required' : '',
        password: !signupData.password ? 'Password is required' : '',
        confirmPassword: !signupData.confirmPassword ? 'Please confirm your password' : '',
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (signupData.password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create account
      const { data, error } = await supabase.auth.signUp(
        {
          email: signupData.email,
          password: signupData.password,
        },
        {
          // Ensure the user returns to auth flow after email confirmation
          redirectTo: `${globalThis.location.origin}/auth?mode=complete-profile`,
        }
      );

      if (error) {
        const requestId = generateRequestId();
        console.error('Supabase auth.signUp error:', { requestId, error });
        toast({
          title: 'Sign Up Failed',
          description: `${error.message} (ref: ${requestId})`,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        // Account created successfully with an immediate session (some providers/browser combos)
        toast({
          title: 'Account Created!',
          description: 'Please complete your profile information',
        });

        // Try to wait briefly for a profile row created by DB trigger, then redirect
        (async () => {
            try {
              const { waitForProfile } = await import('@/utils/waitForProfile');
              const profile = await waitForProfile(data.user.id, 6, 400, {
                onAttempt: (attempt, delayMs) => console.debug(`waitForProfile attempt ${attempt}, next delay ${delayMs}ms`),
              });

              if (!profile) {
                try {
                  const { completeProfileViaBackend } = await import('@/utils/completeProfile');
                  const email = data.user.email ?? (() => {
                    try {
                      const pending = localStorage.getItem('pendingSignup');
                      if (pending) return JSON.parse(pending)?.email;
                    } catch (e) {}
                    return null;
                  })();
                  const pending = (() => {
                    try { return JSON.parse(localStorage.getItem('pendingSignup') || '{}'); } catch (e) { return {}; }
                  })();
                  const requestId = pending?.requestId || generateRequestId();
                  if (email) {
                    try {
                      await completeProfileViaBackend(email, undefined, requestId);
                      toast({ title: 'Profile created', description: 'Your profile was created successfully.' });
                      try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                    } catch (e) {
                      console.warn('completeProfileViaBackend fallback failed', e);
                      toast({ title: 'Profile creation pending', description: 'We will retry automatically. If the issue persists, contact support.', variant: 'destructive' });
                    }
                  }
                } catch (e) {
                  console.warn('completeProfileViaBackend fallback failed', e);
                }
              }
            } catch (e) {
              // ignore polling failures but log for telemetry
              console.warn('Profile polling after signup failed', e);
            } finally {
              setTimeout(() => {
                navigate('/register', { replace: true });
              }, 700);
            }
        })();
      } else {
        // No immediate session returned (email confirmation required).
        // Persist pending signup data so we can complete profile after email confirmation.
        try {
          const requestId = generateRequestId();
          localStorage.setItem('pendingSignup', JSON.stringify({ email: signupData.email, createdAt: Date.now(), requestId }));
        } catch (e) {
          // ignore storage errors
        }

        toast({
          title: 'Account Created — Confirm Email',
          description: 'Check your email and follow the confirmation link. After confirming, return to Sign In to complete your profile.',
        });
        // Switch to login mode
        setIsSignup(false);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Sign up error:', error);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure captcha is only used for login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    /* Captcha check for login (disabled)
    // Captcha must be completed for login
    if (!captchaToken) {
      toast({
        title: 'Security Verification Required',
        description: 'Please complete the captcha verification',
        variant: 'destructive',
      });
      return;
    }
    */

    setIsLoading(true);

    try {
      /* Turnstile verification (disabled)
      // Step 1: Verify Turnstile token with Edge Function
      const verifyResponse = await fetch(
        'https://mkcgkfzltohxagqvsbqk.supabase.co/functions/v1/verify-turnstile',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: captchaToken }),
        }
      );

      if (!verifyResponse.ok) {
        throw new Error(`Verification service error: ${verifyResponse.statusText}`);
      }

      const verificationData = await verifyResponse.json();

      // Check if verification was successful
      if (!verificationData.success || !verificationData.data?.success) {
        const errorCodes = verificationData.data?.error_codes || [];
        const errorMessage = errorCodes.includes('timeout-or-duplicate')
          ? 'Security verification expired. Please try again.'
          : errorCodes.includes('invalid-input-response')
          ? 'Invalid security verification. Please refresh and try again.'
          : 'Security verification failed. Please try again.';

        toast({
          title: 'Security Verification Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        resetCaptcha('captcha-container');
        return;
      }
      */

      // Step 2: Log in user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
        resetCaptcha('captcha-container');
        return;
      }

      if (data.user) {
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent flex items-center justify-center p-4">
      {isForgotPassword ? (
        <ForgotPassword onBack={() => setIsForgotPassword(false)} />
      ) : (
        <Card className="w-full max-w-md shadow-hero">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src={turuturuLogo}
                alt="Turuturu Stars Logo"
                className="h-16 w-auto object-contain"
                loading="eager"
                width="64"
                height="64"
              />
            </div>
            <div>
              <CardTitle className="heading-display text-2xl">
                {isSignup ? 'Create Account' : 'Welcome Back'}
              </CardTitle>
              <CardDescription className="mt-2">
                {isSignup 
                  ? 'Join Turuturu Stars Community today' 
                  : 'Sign in to access your member dashboard'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isSignup ? (
              // SIGNUP FORM
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email Address *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className={errors.email ? 'border-destructive' : ''}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Create Account Button */}
                <Button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            ) : (
              // LOGIN FORM
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? 'border-destructive' : ''}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-primary hover:underline transition-colors font-medium"
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Captcha UI (disabled)
                <div className="space-y-3 my-4">
                  <div className="flex justify-center p-4 bg-card border border-border rounded-lg">
                    <div id="captcha-container" className="flex justify-center w-full"></div>
                  </div>
                  
                  {captchaError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-sm text-destructive flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        {captchaError}
                      </p>
                      <p className="text-xs text-destructive/70 mt-2">
                        💡 If the problem persists:
                        <br />
                        1. Refresh the page
                        <br />
                        2. Check your browser's cookies/storage settings
                        <br />
                        3. Try a different browser
                      </p>
                    </div>
                  )}
                  
                  {captchaToken && !captchaError && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Security verification complete ✓</span>
                    </div>
                  )}
                </div>
                */}

                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Sign Up / Sign In Toggle Link */}
            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {isSignup ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setErrors({});
                  resetCaptcha('captcha-container');
                }}
                disabled={isLoading}
              >
                {isSignup ? 'Sign In' : 'Create an Account'}
              </Button>
              {!isSignup && (
                <p className="text-xs text-muted-foreground">
                  Join Turuturu Stars Community to access member benefits and participate in community activities.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Auth;
