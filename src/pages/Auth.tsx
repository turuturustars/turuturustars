import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle, Phone, MapPin, Briefcase } from 'lucide-react';
import { z } from 'zod';
import { usePageMeta } from '@/hooks/usePageMeta';
import ForgotPassword from '@/components/ForgotPassword';
import turuturuLogo from '@/assets/turuturustarslogo.png';

// Location options
const LOCATIONS = [
  'Turuturu',
  'Gatune',
  'Mutoho',
  'Githeru',
  'Kahariro',
  'Kiangige',
  'Daboo',
  'Githima',
  'Nguku',
  'Ngaru',
  'Kiugu',
  'Kairi',
  'Other'
] as const;

// Validation schema for registration
const registrationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  idNumber: z.string().min(6, 'Please enter a valid ID number'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  occupation: z.string().optional(),
  location: z.string().min(1, 'Please select a location'),
  otherLocation: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.location !== 'Other' || (data.otherLocation && data.otherLocation.length >= 2), {
  message: "Please specify your location",
  path: ["otherLocation"],
});

// Login schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Auth = () => {
  usePageMeta({
    title: 'Login & Register - Turuturu Stars CBO',
    description: 'Create your account or log in to Turuturu Stars Community Platform. Join us to manage contributions, welfare assistance, and community activities.',
    keywords: ['login', 'register', 'sign up', 'membership', 'Turuturu Stars'],
    canonicalUrl: 'https://turuturustars.co.ke/auth',
    robots: 'index,follow'
  });

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Phone verification states
  const [verificationStep, setVerificationStep] = useState<'form' | 'verify' | 'verified' | 'skipped'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    idNumber: '',
    occupation: '',
    location: '',
    otherLocation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse({ email: formData.email, password: formData.password });
      } else {
        registrationSchema.parse(formData);
      }
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

  const sendVerificationCode = async () => {
    // Validate phone first
    if (!formData.phone || formData.phone.length < 10) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number' }));
      return;
    }

    setIsSendingCode(true);
    setVerificationFailed(false);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-verify', {
        body: { action: 'send', phone: formData.phone }
      });

      if (error) throw error;

      if (data?.success) {
        setVerificationStep('verify');
        toast({
          title: 'Verification Code Sent',
          description: `A verification code has been sent to ${formData.phone}`,
        });
      } else {
        throw new Error(data?.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Send verification error:', error);
      setVerificationFailed(true);
      toast({
        title: 'SMS Verification Unavailable',
        description: 'You can still register - we\'ll verify your phone later.',
        variant: 'default',
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const skipVerification = () => {
    setVerificationStep('skipped');
    toast({
      title: 'Verification Skipped',
      description: 'You can proceed with registration. Phone verification will be done later.',
    });
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length < 4) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid verification code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-verify', {
        body: { action: 'verify', phone: formData.phone, code: verificationCode }
      });

      if (error) throw error;

      if (data?.success && data?.valid) {
        setVerificationStep('verified');
        toast({
          title: 'Phone Verified',
          description: 'Your phone number has been verified successfully',
        });
      } else {
        throw new Error(data?.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Verify code error:', error);
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${globalThis.location.origin}/dashboard`,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // For registration, allow verified OR skipped verification
    if (!isLogin && verificationStep !== 'verified' && verificationStep !== 'skipped') {
      toast({
        title: 'Phone Verification Required',
        description: 'Please verify your phone number or skip verification to continue',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Login Failed',
              description: 'Invalid email or password. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Login Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        }
      } else {
        const redirectUrl = `${globalThis.location.origin}/dashboard`;
        const finalLocation = formData.location === 'Other' ? formData.otherLocation : formData.location;
        
        // Use phone as email if no email provided
        const emailToUse = formData.email || `${formData.phone.replace(/\D/g, '')}@turuturustars.co.ke`;
        
        const { error } = await supabase.auth.signUp({
          email: emailToUse,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              id_number: formData.idNumber,
              occupation: formData.occupation || null,
              location: finalLocation,
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account Exists',
              description: 'An account with this email/phone already exists. Please login instead.',
              variant: 'destructive',
            });
            setIsLogin(true);
          } else {
            toast({
              title: 'Registration Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome to Turuturu Stars!',
            description: 'Your account has been created successfully.',
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      console.error('Authentication error:', error);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetVerification = () => {
    setVerificationStep('form');
    setVerificationCode('');
  };

  const getButtonText = (): string => {
    return isLogin ? 'Sign In' : 'Create Account';
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
                className="h-16 w-auto rounded-full shadow-elevated object-contain"
                loading="eager"
                width="64"
                height="64"
              />
            </div>
            <div>
              <CardTitle className="heading-display text-2xl">
                {isLogin ? 'Welcome Back' : 'Join Turuturu Stars'}
              </CardTitle>
              <CardDescription className="mt-2">
                {isLogin
                  ? 'Sign in to access your member dashboard'
                  : 'Create your account to become a member'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>

                {/* ID Number */}
                <div className="space-y-2">
                  <Label htmlFor="idNumber">National ID Number *</Label>
                  <Input
                    id="idNumber"
                    placeholder="e.g., 12345678"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className={errors.idNumber ? 'border-destructive' : ''}
                  />
                  {errors.idNumber && (
                    <p className="text-sm text-destructive">{errors.idNumber}</p>
                  )}
                </div>

                {/* Phone Number with Verification */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number *
                    {verificationStep === 'verified' && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 0712345678"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (verificationStep !== 'form') resetVerification();
                      }}
                      className={`flex-1 ${errors.phone ? 'border-destructive' : ''}`}
                      disabled={verificationStep === 'verified'}
                    />
                    {verificationStep === 'form' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={sendVerificationCode}
                        disabled={isSendingCode || !formData.phone || formData.phone.length < 10}
                        className="whitespace-nowrap"
                      >
                        {isSendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </Button>
                    )}
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                {/* Verification Code Input */}
                {verificationStep === 'verify' && (
                  <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label htmlFor="verificationCode">Enter Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verificationCode"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="flex-1"
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        onClick={verifyCode}
                        disabled={isVerifying || verificationCode.length < 4}
                      >
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={sendVerificationCode}
                        className="text-xs text-primary hover:underline"
                        disabled={isSendingCode}
                      >
                        Resend code
                      </button>
                      <button
                        type="button"
                        onClick={resetVerification}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Change number
                      </button>
                      <button
                        type="button"
                        onClick={skipVerification}
                        className="text-xs text-orange-600 hover:underline font-medium"
                      >
                        Skip verification
                      </button>
                    </div>
                  </div>
                )}

                {/* Skip Verification Option if SMS fails */}
                {verificationFailed && verificationStep === 'form' && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 mb-2">SMS verification is currently unavailable.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={skipVerification}
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      Continue without phone verification
                    </Button>
                  </div>
                )}

                {/* Verification Skipped Notice */}
                {verificationStep === 'skipped' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-800">You can proceed with registration</p>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location *
                  </Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger className={errors.location ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select your location" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.location && (
                    <p className="text-sm text-destructive">{errors.location}</p>
                  )}
                </div>

                {/* Other Location */}
                {formData.location === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor="otherLocation">Specify Location *</Label>
                    <Input
                      id="otherLocation"
                      placeholder="Enter your location"
                      value={formData.otherLocation}
                      onChange={(e) => setFormData({ ...formData, otherLocation: e.target.value })}
                      className={errors.otherLocation ? 'border-destructive' : ''}
                    />
                    {errors.otherLocation && (
                      <p className="text-sm text-destructive">{errors.otherLocation}</p>
                    )}
                  </div>
                )}

                {/* Occupation (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="occupation" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Occupation
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="occupation"
                    placeholder="e.g., Farmer, Teacher, Business"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  />
                </div>

                {/* Email (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address
                    {' '}
                    <span className="text-xs text-muted-foreground ml-2">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              </>
            )}

            {/* Login Email (Required for login) */}
            {isLogin && (
              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email or Phone *</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            )}

            {/* Password */}
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password link (Login only) */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Confirm Password (Registration only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading || (!isLogin && verificationStep !== 'verified')}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </form>

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

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                resetVerification();
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default Auth;
