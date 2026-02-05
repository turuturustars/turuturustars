import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, AlertCircle, Mail, Lock } from 'lucide-react';
import { z } from 'zod';
import { buildSiteUrl } from '@/utils/siteUrl';
import { isProfileComplete } from '@/utils/profileCompletion';
import { registerWithEmail, signInUser } from '@/lib/authService';

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

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
}

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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateLogin()) return;

    setIsLoading(true);

    try {
      await signInUser({
        email: loginData.email,
        password: loginData.password,
      });

      toast({
        title: 'Success',
        description: 'You have been signed in successfully',
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, id_number')
          .eq('id', session.user.id)
          .single();

        if (isProfileComplete(profile as any)) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/register', { replace: true });
        }
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      if (message.toLowerCase().includes('invalid login credentials')) {
        setErrors({ submit: 'Invalid email or password' });
      } else if (message.toLowerCase().includes('email not confirmed')) {
        setErrors({ submit: 'Please check your email to confirm your account' });
      } else {
        setErrors({ submit: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateSignup()) return;

    setIsLoading(true);

    try {
      const response = await registerWithEmail({
        email: signupData.email,
        password: signupData.password,
        redirectTo: buildSiteUrl('/auth/callback'),
      });

      toast({
        title: 'Check your email',
        description: 'We sent you a verification link. Please check your inbox and spam folder.',
      });

      if (response.userId) {
        try {
          localStorage.setItem('pendingSignup', JSON.stringify({
            email: signupData.email,
            userId: response.userId,
            timestamp: new Date().toISOString(),
          }));
        } catch (e) {
          console.warn('Could not save pending signup to localStorage');
        }
      }

      navigate('/register', { replace: true });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('already registered')) {
        setErrors({ submit: 'An account with this email already exists' });
      } else {
        setErrors({ submit: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildSiteUrl('/auth/callback'),
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign in with Google. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      setErrors({ email: 'Please enter your email address first' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: buildSiteUrl('/auth/reset-password'),
      });

      if (error) throw error;

      toast({
        title: 'Password reset email sent',
        description: 'Check your inbox for the password reset link',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send password reset email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-start sm:items-center justify-center bg-gradient-to-br from-background to-muted/30 px-4 py-6">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Sign in to your Turuturu Stars account' 
              : 'Join the Turuturu Stars Community'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error message */}
          {errors.submit && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {errors.submit}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={mode === 'login' ? loginData.email : signupData.email}
                onChange={(e) => 
                  mode === 'login' 
                    ? setLoginData(prev => ({ ...prev, email: e.target.value }))
                    : setSignupData(prev => ({ ...prev, email: e.target.value }))
                }
                className={errors.email ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter your password'}
                  value={mode === 'login' ? loginData.password : signupData.password}
                  onChange={(e) =>
                    mode === 'login'
                      ? setLoginData(prev => ({ ...prev, password: e.target.value }))
                      : setSignupData(prev => ({ ...prev, password: e.target.value }))
                  }
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={signupData.confirmPassword}
                    onChange={(e) =>
                      setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Forgot password link (login only) */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <Button type="submit" disabled={isLoading} className="w-full">
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
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">or</span>
              </div>
            </div>

            {/* Google sign in */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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

            {/* Toggle mode */}
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground pt-4">
            By signing up, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthenticationForm;

