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
import turuturuLogo from '@/assets/turuturustarslogo.png';

const LOCATIONS = [
  'Nairobi',
  'Kisumu',
  'Mombasa',
  'Nakuru',
  'Eldoret',
  'Kiambu',
  'Uasin Gishu',
  'Murang\'a',
  'Nyeri',
  'Other'
];

const registrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  idNumber: z.string().min(6, 'ID number must be at least 6 characters'),
  location: z.string().min(1, 'Location is required'),
  otherLocation: z.string().optional(),
  occupation: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const Register = () => {
  usePageMeta({
    title: 'Sign Up | Turuturu Stars Community',
    description: 'Create your account to join Turuturu Stars Community Platform. Sign up to manage contributions and access community benefits.',
    keywords: ['sign up', 'register', 'membership', 'Turuturu Stars'],
    canonicalUrl: 'https://turuturustars.co.ke/register',
    robots: 'index,follow'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationStep, setVerificationStep] = useState<'form' | 'verify' | 'verified'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const sendVerificationCode = async () => {
    try {
      setIsSendingCode(true);
      setErrors({});

      if (!formData.phone || formData.phone.length < 10) {
        setErrors({ phone: 'Please enter a valid phone number' });
        return;
      }

      const { error: sendError } = await supabase.auth.signInWithOtp({
        phone: formData.phone,
        options: {
          shouldCreateUser: true,
        },
      });

      if (sendError) throw sendError;

      setVerificationStep('verify');
      toast({
        title: 'Verification code sent',
        description: 'Check your phone for the verification code.',
      });
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send verification code',
        variant: 'destructive',
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyPhoneNumber = async () => {
    try {
      setIsVerifying(true);
      setErrors({});

      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: formData.phone,
        token: verificationCode,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      setVerificationStep('verified');
      toast({
        title: 'Phone verified successfully!',
        description: 'You can now complete your registration.',
      });
    } catch (error) {
      console.error('Error verifying phone:', error);
      setErrors({
        verification: error instanceof Error ? error.message : 'Invalid verification code',
      });
      toast({
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setVerificationStep('form');
    setVerificationCode('');
  };

  const validateForm = () => {
    try {
      const dataToValidate = {
        ...formData,
        email: formData.email || '',
        occupation: formData.occupation || '',
        otherLocation: formData.otherLocation || '',
      };
      registrationSchema.parse(dataToValidate);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path[0];
          if (path) {
            newErrors[path] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation error',
        description: 'Please check the form for errors',
        variant: 'destructive',
      });
      return;
    }

    if (verificationStep !== 'verified') {
      toast({
        title: 'Phone verification required',
        description: 'Please verify your phone number first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});

      // Create account
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email || `${formData.phone}@sms-user.turuturustars.co.ke`,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            id_number: formData.idNumber,
            location: formData.location === 'Other' ? formData.otherLocation : formData.location,
            occupation: formData.occupation || '',
          },
        },
      });

      if (authError) throw authError;

      // Show success message
      setSuccessMessage('Account created successfully! Redirecting to login...');
      toast({
        title: 'Account created',
        description: 'Your registration is complete. Redirecting to login...',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      setErrors({ form: errorMessage });
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-hero">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Welcome to Turuturu Stars!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {successMessage}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent flex items-center justify-center p-4">
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
            <CardTitle className="heading-display text-2xl">Join Turuturu Stars</CardTitle>
            <CardDescription className="mt-2">
              Create your account to become a member
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Verification Step */}
            {verificationStep === 'verify' && (
              <div className="space-y-3 p-3 bg-secondary rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code *</Label>
                  <Input
                    id="verificationCode"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                    maxLength={6}
                    type="text"
                    className={errors.verification ? 'border-destructive' : ''}
                  />
                  {errors.verification && (
                    <p className="text-sm text-destructive">{errors.verification}</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={verifyPhoneNumber}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="w-full"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={isSendingCode}
                    className="text-primary hover:underline"
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
                </div>
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
                <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
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

            {/* Confirm Password */}
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

            {/* Form error */}
            {errors.form && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                {errors.form}
              </div>
            )}

            <Button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading || verificationStep !== 'verified'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
