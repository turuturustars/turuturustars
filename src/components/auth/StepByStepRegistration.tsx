import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
// Turnstile / CAPTCHA disabled — the hook implementation is preserved but the integration is turned off.
import {
  Loader2,
  MapPin,
  Briefcase,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Clock,
  Heart,
  BookOpen,
  Home,
  AlertCircle,
  Sparkles,
  Trophy,
  ArrowRight,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import './RegistrationAnimations.css';

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

interface RegistrationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  questions: string[];
}

const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Let\'s start with your basic information',
    icon: <User className="w-5 h-5" />,
    required: true,
    questions: ['Full Name', 'ID Number', 'Phone Number'],
  },
  {
    id: 'location',
    title: 'Where Are You From?',
    description: 'Help us know your location',
    icon: <MapPin className="w-5 h-5" />,
    required: true,
    questions: ['Select Location'],
  },
  {
    id: 'occupation',
    title: 'About Your Work',
    description: 'Tell us about your occupation',
    icon: <Briefcase className="w-5 h-5" />,
    required: false,
    questions: ['Occupation', 'Employment Status'],
  },
  {
    id: 'interests',
    title: 'Your Interests',
    description: 'What areas interest you?',
    icon: <Heart className="w-5 h-5" />,
    required: false,
    questions: ['Areas of Interest'],
  },
  {
    id: 'education',
    title: 'Education Level',
    description: 'Your educational background',
    icon: <BookOpen className="w-5 h-5" />,
    required: false,
    questions: ['Education Level'],
  },
  {
    id: 'additional-info',
    title: 'Additional Information',
    description: 'Any other information you\'d like to share',
    icon: <Home className="w-5 h-5" />,
    required: false,
    questions: ['Additional Notes'],
  },
];

interface FormData {
  fullName: string;
  idNumber: string;
  phone: string;
  location: string;
  otherLocation: string;
  occupation: string;
  employmentStatus: string;
  interests: string[];
  educationLevel: string;
  additionalNotes: string;
  isStudent: boolean;
}

interface StepByStepRegistrationProps {
  user: {
    id: string;
    email?: string;
  };
}

const StepByStepRegistration = ({ user }: StepByStepRegistrationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    idNumber: '',
    phone: '',
    location: '',
    otherLocation: '',
    occupation: '',
    employmentStatus: '',
    interests: [],
    educationLevel: '',
    additionalNotes: '',
    isStudent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Placeholders while CAPTCHA/Turnstile is disabled
  const turnstileToken = null as string | null;
  const turnstileError = null as string | null;
  const renderCaptcha = async (_containerId?: string) => {};
  const resetCaptcha = () => {};
  const removeCaptcha = () => {};
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data?.full_name && data?.phone && data?.id_number) {
          navigate('/dashboard', { replace: true });
        } else if (data) {
          setFormData(prev => ({
            ...prev,
            fullName: data.full_name || '',
            phone: data.phone || '',
            idNumber: data.id_number || '',
            occupation: ((data as unknown) as Record<string, unknown>).occupation as string || '',
            location: ((data as unknown) as Record<string, unknown>).location as string || '',
          }));
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingProfile();
  }, [user.id, navigate]);

  // Turnstile lifecycle code is disabled while CAPTCHA is turned off.
  // Original behavior: render CAPTCHA on step 0 and remove on other steps.

  const validateStep = (stepId: string): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepId) {
      case 'personal-info':
        if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (formData.phone.length < 10) newErrors.phone = 'Invalid phone number';
        if (!formData.idNumber.trim()) newErrors.idNumber = 'ID number is required';
        // Turnstile token required on first step (disabled)
        // if (!turnstileToken) newErrors.turnstile = 'Please complete the security verification';
        break;
      case 'location':
        if (!formData.location) newErrors.location = 'Please select a location';
        if (formData.location === 'Other' && !formData.otherLocation.trim()) {
          newErrors.otherLocation = 'Please specify your location';
        }
        break;
      case 'occupation':
        // Optional step
        break;
      case 'interests':
        // Optional step
        break;
      case 'education':
        // Optional step
        break;
      case 'additional-info':
        // Optional step
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    const currentStepData = REGISTRATION_STEPS[currentStep];

    if (currentStepData.required) {
      if (!validateStep(currentStepData.id)) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep < REGISTRATION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSkipStep = () => {
    if (!REGISTRATION_STEPS[currentStep].required) {
      handleNext();
      toast({
        title: 'Step Skipped',
        description: 'You can fill this in later',
      });
    }
  };

  const handleChange = (field: keyof FormData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors; });
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep(REGISTRATION_STEPS[currentStep].id)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const finalLocation = formData.location === 'Other' ? formData.otherLocation : formData.location;

      // Save profile data to database
      // Status is 'pending' until email is verified
      const { error } = await (await import('@/utils/supabaseRetry')).retryUpsert(
        'profiles',
        {
          id: user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          id_number: formData.idNumber,
          email: user.email,
          location: finalLocation,
          occupation: formData.occupation || null,
          is_student: formData.isStudent,
          status: 'pending', // Pending email verification
          email_verified_at: null, // Will be set after email confirmation
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
        3,
        300
      );

      if (error) throw error;

      // Store pending signup info in localStorage for recovery
      try {
        localStorage.setItem('pendingSignup', JSON.stringify({
          email: user.email,
          userId: user.id,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        console.warn('Could not save pending signup to localStorage');
      }

      resetCaptcha();

      // Note: Email verification is handled by Supabase automatically
      // User will receive a confirmation email at user.email
      toast({
        title: 'Account Created!',
        description: 'Check your email to verify your account and complete registration.',
      });

      // Redirect to check email page
      setTimeout(() => {
        navigate('/register', { replace: true });
      }, 1500);
    } catch (error) {
      console.error('Error during signup:', error);

      // Provide user-friendly error messages
      let errorDescription = 'Failed to complete signup';
      if (error instanceof Error) {
        errorDescription = error.message;
      }

      toast({
        title: 'Signup Error',
        description: errorDescription,
        variant: 'destructive',
      });

      // Reset captcha on error for retry
      resetCaptcha();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-background/80 backdrop-blur-sm rounded-full p-6 border-2 border-primary/20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  const currentStepData = REGISTRATION_STEPS[currentStep];
  const progress = ((currentStep + 1) / REGISTRATION_STEPS.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-blue-50/50 to-background dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 py-12">
      <div className="w-full max-w-4xl space-y-6 card-stagger">
        {/* Progress Section */}
        <div className="space-y-3 progress-bar">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <Sparkles className="w-6 h-6 text-blue-500 engagement-icon flex-shrink-0" />
                <span>Welcome to Turuturu Stars</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
                Let's set up your profile step by step
              </p>
            </div>
            <div className="text-left md:text-right flex-shrink-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Step {currentStep + 1} of {REGISTRATION_STEPS.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Math.round(progress)}% complete
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2 progress-fill" />
        </div>

        {/* Steps Navigation */}
        <div className="hidden md:grid grid-cols-6 gap-2 step-indicators">
          {REGISTRATION_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const borderClass = isActive
              ? 'border-primary bg-primary/10'
              : isCompleted
              ? 'border-green-500/50 bg-green-50/20 dark:bg-green-950/20'
              : 'border-muted hover:border-primary/50';
            const iconBgClass = isCompleted
              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
              : isActive
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground';

            return (
              <button
                key={step.id}
                type="button"
                className={`relative transition-all step-indicator ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (index <= currentStep) {
                    setCurrentStep(index);
                    setErrors({});
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && index <= currentStep) {
                    setCurrentStep(index);
                    setErrors({});
                  }
                }}
                aria-label={`Go to step: ${step.title}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${borderClass}`}
                >
                  <div
                    className={`p-2 rounded-lg ${iconBgClass}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 step-completion-check" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <p className="text-xs font-semibold text-center leading-tight line-clamp-2">
                    {step.title}
                  </p>
                </div>
                {index < REGISTRATION_STEPS.length - 1 && (
                  <div
                    className={`absolute left-full top-1/2 h-0.5 -translate-y-1/2 ${
                      isCompleted ? 'bg-green-500' : 'bg-muted'
                    }`}
                    style={{ width: '8px', marginLeft: '-2px', marginRight: '-2px' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Card */}
        <Card className="shadow-lg registration-card registration-step-content bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700">
          <CardHeader className="space-y-2 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mt-1 step-badge text-blue-600 dark:text-blue-400">
                {currentStepData.icon}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl md:text-3xl text-slate-900 dark:text-white break-words">
                  {currentStepData.title}
                </CardTitle>
                <CardDescription className="mt-1 text-slate-600 dark:text-slate-300">
                  {currentStepData.description}
                </CardDescription>
                {!currentStepData.required && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded-md tooltip-animation font-medium">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>Optional - You can skip this step</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6 pb-8 px-4 md:px-8">

            {/* Personal Info Step */}
            {currentStepData.id === 'personal-info' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm md:text-base">
                    Full Name
                    {' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="e.g., John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className={`registration-input transition-all border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${errors.fullName ? 'border-red-500 focus-visible:ring-red-500 field-error' : 'focus-visible:border-blue-500 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-900'}`}
                    disabled={isSaving}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idNumber" className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm md:text-base">
                      ID Number
                      {' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="idNumber"
                      placeholder="e.g., 12345678"
                      value={formData.idNumber}
                      onChange={(e) => handleChange('idNumber', e.target.value)}
                      className={`border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${errors.idNumber ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:border-blue-500 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-900'}`}
                      disabled={isSaving}
                    />
                    {errors.idNumber && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.idNumber}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm md:text-base">
                      Phone Number
                      {' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="+254 700 000 000"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={`border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:border-blue-500 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-900'}`}
                      disabled={isSaving}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cloudflare Turnstile Captcha */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-semibold">Security Verification</Label>
                    <span className="text-red-500">*</span>
                  </div>
                  <div id="turnstile-container" className="flex justify-center py-2" />
                  {turnstileError && (
                    <p className="text-xs text-red-500 flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded">
                      <AlertCircle className="w-3 h-3" />
                      {turnstileError}
                    </p>
                  )}
                  {!turnstileError && turnstileToken && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Security verification completed
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This helps us keep your account secure
                  </p>
                </div>
              </div>
            )}

            {/* Location Step */}
            {currentStepData.id === 'location' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    Where are you from?
                    {' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.location} onValueChange={(value) => handleChange('location', value)} disabled={isSaving}>
                    <SelectTrigger className={errors.location ? 'border-red-500 focus-visible:ring-red-500' : ''}>
                      <SelectValue placeholder="Select your location" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.location && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.location}
                    </p>
                  )}
                </div>

                {formData.location === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor="otherLocation" className="flex items-center gap-2">
                      Specify your location
                      {' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="otherLocation"
                      placeholder="Enter your location"
                      value={formData.otherLocation}
                      onChange={(e) => handleChange('otherLocation', e.target.value)}
                      className={errors.otherLocation ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      disabled={isSaving}
                    />
                    {errors.otherLocation && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.otherLocation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Occupation Step */}
            {currentStepData.id === 'occupation' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="occupation" className="flex items-center gap-2">
                    What's your occupation?
                  </Label>
                  <Input
                    id="occupation"
                    placeholder="e.g., Teacher, Engineer, Farmer"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps us understand our community better
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Employment Status
                  </Label>
                  <Select value={formData.employmentStatus} onValueChange={(value) => handleChange('employmentStatus', value)} disabled={isSaving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self-employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <Checkbox
                    id="isStudent"
                    checked={formData.isStudent}
                    onCheckedChange={(checked) => handleChange('isStudent', checked)}
                    disabled={isSaving}
                  />
                  <Label htmlFor="isStudent" className="flex-1 cursor-pointer font-normal">
                    I am a student
                  </Label>
                </div>
              </div>
            )}

            {/* Interests Step */}
            {currentStepData.id === 'interests' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Select areas that interest you
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'Education',
                    'Healthcare',
                    'Agriculture',
                    'Business',
                    'Technology',
                    'Sports',
                    'Arts & Culture',
                    'Environment',
                    'Community Development'
                  ].map((interest) => (
                    <button
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      disabled={isSaving}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.interests.includes(interest)
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-muted hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Education Step */}
            {currentStepData.id === 'education' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="educationLevel" className="flex items-center gap-2">
                    Highest Level of Education
                  </Label>
                  <Select value={formData.educationLevel} onValueChange={(value) => handleChange('educationLevel', value)} disabled={isSaving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary School</SelectItem>
                      <SelectItem value="secondary">Secondary School</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                      <SelectItem value="masters">Master's Degree</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Additional Info Step */}
            {currentStepData.id === 'additional-info' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="additionalNotes" className="flex items-center gap-2">
                    Anything else you'd like us to know?
                  </Label>
                  <Textarea
                    id="additionalNotes"
                    placeholder="Tell us about yourself, your goals, or any additional information..."
                    value={formData.additionalNotes}
                    onChange={(e) => handleChange('additionalNotes', e.target.value)}
                    disabled={isSaving}
                    className="resize-none h-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is optional - you can leave it blank if you prefer
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || isSaving}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {!REGISTRATION_STEPS[currentStep].required && currentStep < REGISTRATION_STEPS.length - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkipStep}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Skip
                </Button>
              )}

              {currentStep === REGISTRATION_STEPS.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Fields marked with <span className="text-red-500 font-bold">*</span> are required
          </p>
          <p className="text-xs text-muted-foreground">
            ✨ You can update any information anytime in your dashboard settings
          </p>
          {currentStep === REGISTRATION_STEPS.length - 1 && (
            <div className="pt-2">
              <p className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Almost done! Review and submit to complete registration
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepByStepRegistration;
