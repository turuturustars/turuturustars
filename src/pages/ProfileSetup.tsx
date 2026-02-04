import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { buildSiteUrl } from '@/utils/siteUrl';

interface ProfileFormData {
  fullName: string;
  phone: string;
  location: string;
  bio: string;
  profileImage: File | null;
}

interface ProfileFormErrors {
  [key: string]: string;
}

/**
 * Profile Setup Page
 * 
 * After a user signs up and verifies their email, they are redirected here
 * to complete their profile information before accessing the dashboard.
 */
const ProfileSetup = () => {
  usePageMeta({
    title: 'Complete Your Profile - Turuturu Stars',
    description: 'Set up your Turuturu Stars community profile with your information and photo.',
    robots: 'noindex,nofollow', // Don't index this page
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [step, setStep] = useState<'verify' | 'profile'>('verify');
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    phone: '',
    location: '',
    bio: '',
    profileImage: null,
  });

  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          toast({
            title: 'Not Authenticated',
            description: 'Please sign up first to create a profile.',
            variant: 'destructive',
          });
          navigate('/auth?mode=signup', { replace: true });
          return;
        }

        setCurrentUser({ id: user.id, email: user.email });

        // Check if email is already verified
        if (user.email_confirmed_at) {
          setStep('profile');
        } else {
          setStep('verify');
          setEmailVerificationSent(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        toast({
          title: 'Error',
          description: 'Failed to check authentication status',
          variant: 'destructive',
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate, toast]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (emailVerificationSent) {
      setShowResendButton(true);
    }
  }, [resendCountdown, emailVerificationSent]);

  const validateProfileForm = (): boolean => {
    const newErrors: ProfileFormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setFormData({ ...formData, profileImage: file });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleResendVerificationEmail = async () => {
    if (!currentUser?.email) return;

    setIsLoading(true);
    setShowResendButton(false);
    setResendCountdown(300); // 5 minutes

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentUser.email,
        options: {
          emailRedirectTo: buildSiteUrl('/auth/confirm'),
        },
      });

      if (error) {
        toast({
          title: 'Failed to Resend',
          description: error.message,
          variant: 'destructive',
        });
        setShowResendButton(true);
        setResendCountdown(0);
        return;
      }

      toast({
        title: 'Email Sent',
        description: 'Check your inbox for the verification link',
      });
    } catch (error) {
      console.error('Resend error:', error);
      toast({
        title: 'Error',
        description: 'Failed to resend verification email',
        variant: 'destructive',
      });
      setShowResendButton(true);
      setResendCountdown(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateProfileForm()) return;

    setIsLoading(true);

    try {
      // Upload profile image if provided
      let profileImageUrl: string | null = null;

      if (formData.profileImage && currentUser) {
        const fileName = `${currentUser.id}-${Date.now()}-${formData.profileImage.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(`avatars/${fileName}`, formData.profileImage);

        if (uploadError) {
          toast({
            title: 'Image Upload Failed',
            description: uploadError.message,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(`avatars/${fileName}`);

        profileImageUrl = publicUrl;
      }

      // Create or update profile
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: currentUser?.id,
            full_name: formData.fullName,
            phone: formData.phone || null,
            location: formData.location,
            bio: formData.bio || null,
            avatar_url: profileImageUrl,
            profile_completed_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        toast({
          title: 'Profile Setup Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Profile Complete!',
        description: 'Welcome to Turuturu Stars Community',
      });

      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Profile setup error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your profile setup...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-2xl shadow-hero">
        {/* Email Verification Step */}
        {step === 'verify' && (
          <>
            <CardHeader className="text-center space-y-4 border-b">
              <AlertCircle className="h-12 w-12 text-warning mx-auto" />
              <div>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription className="mt-2">
                  We sent a confirmation link to <span className="font-medium text-foreground">{currentUser?.email}</span>
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="py-8">
              <div className="space-y-6">
                {/* Instructions */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                  <h3 className="font-medium flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    Check Your Email
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">
                    Look for an email from Turuturu Stars with the subject "Confirm your email"
                  </p>

                  <h3 className="font-medium flex items-center gap-2 pt-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                    Click the Link
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">
                    Click the confirmation link in the email to verify your account
                  </p>

                  <h3 className="font-medium flex items-center gap-2 pt-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                    Complete Your Profile
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">
                    You'll be automatically redirected to finish setting up your profile
                  </p>
                </div>

                {/* Tips */}
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">💡 Tips:</p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
                    <li>Check your spam/junk folder if you don't see the email</li>
                    <li>The link expires in 24 hours</li>
                    <li>Need a new link? Use the button below</li>
                  </ul>
                </div>

                {/* Resend Button */}
                <div className="space-y-2">
                  <Button
                    onClick={handleResendVerificationEmail}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || (resendCountdown > 0 && !showResendButton)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : resendCountdown > 0 && !showResendButton ? (
                      `Resend available in ${Math.ceil(resendCountdown / 60)}:${String(resendCountdown % 60).padStart(2, '0')}`
                    ) : (
                      'Resend Verification Email'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Already confirmed your email? <span className="text-primary font-medium">Refresh this page</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Profile Setup Step */}
        {step === 'profile' && (
          <>
            <CardHeader className="text-center space-y-4 border-b">
              <CheckCircle className="h-12 w-12 text-success mx-auto" />
              <div>
                <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                <CardDescription className="mt-2">
                  Tell us about yourself so the community can know you better
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="py-8">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Profile Image */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="profile-image" className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline font-medium">
                        Upload Profile Photo
                      </span>
                    </Label>
                    <Input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      JPG, PNG (Max 5MB)
                    </p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full-name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full-name"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (errors.fullName) {
                        setErrors({ ...errors, fullName: '' });
                      }
                    }}
                    className={errors.fullName ? 'border-destructive' : ''}
                    autoComplete="name"
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+254 7XX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) {
                        setErrors({ ...errors, phone: '' });
                      }
                    }}
                    className={errors.phone ? 'border-destructive' : ''}
                    autoComplete="tel"
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => {
                      setFormData({ ...formData, location: e.target.value });
                      if (errors.location) {
                        setErrors({ ...errors, location: '' });
                      }
                    }}
                    className={errors.location ? 'border-destructive' : ''}
                    autoComplete="address-level2"
                  />
                  {errors.location && (
                    <p className="text-sm text-destructive">{errors.location}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <textarea
                    id="bio"
                    placeholder="Tell us about yourself... (max 500 characters)"
                    value={formData.bio}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 500);
                      setFormData({ ...formData, bio: value });
                    }}
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.bio.length}/500 characters
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    'Complete Setup & Go to Dashboard'
                  )}
                </Button>

                {/* Optional Note */}
                <p className="text-xs text-muted-foreground text-center">
                  You can update your profile information anytime from your dashboard
                </p>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default ProfileSetup;
