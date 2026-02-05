import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import turuturuLogo from '@/assets/turuturustarslogo.png';
import {
  Loader2,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Home,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { buildSiteUrl } from '@/utils/siteUrl';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  idNumber: string;
  location: string;
  otherLocation: string;
}

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
  'Other',
] as const;
 
 const STEPS = [
   { id: 'account', title: 'Create Account', icon: Mail },
   { id: 'personal', title: 'Personal Info', icon: User },
   { id: 'location', title: 'Your Location', icon: MapPin },
   { id: 'confirm', title: 'Confirm', icon: CheckCircle2 },
 ];
 
 const RegistrationFlow = () => {
   const [currentStep, setCurrentStep] = useState(0);
   const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
   const [formData, setFormData] = useState<FormData>({
     email: '',
     password: '',
     confirmPassword: '',
     fullName: '',
     phone: '',
     idNumber: '',
     location: '',
     otherLocation: '',
   });
   const [errors, setErrors] = useState<Record<string, string>>({});
   const navigate = useNavigate();
   const { toast } = useToast();
 
   const handleChange = (field: keyof FormData, value: string) => {
     setFormData((prev) => ({ ...prev, [field]: value }));
     if (errors[field]) {
       setErrors((prev) => {
         const newErrors = { ...prev };
         delete newErrors[field];
         return newErrors;
       });
     }
   };
 
   const validateStep = (stepIndex: number): boolean => {
     const newErrors: Record<string, string> = {};
 
     switch (stepIndex) {
       case 0: // Account
         if (!formData.email.trim()) {
           newErrors.email = 'Email is required';
         } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
           newErrors.email = 'Please enter a valid email';
         }
         if (!formData.password) {
           newErrors.password = 'Password is required';
         } else if (formData.password.length < 6) {
           newErrors.password = 'Password must be at least 6 characters';
         }
         if (formData.password !== formData.confirmPassword) {
           newErrors.confirmPassword = 'Passwords do not match';
         }
         break;
       case 1: // Personal
         if (!formData.fullName.trim()) {
           newErrors.fullName = 'Full name is required';
         }
         if (!formData.phone.trim()) {
           newErrors.phone = 'Phone number is required';
         } else if (!/^(\+254|0)[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
           newErrors.phone = 'Please enter a valid Kenyan phone number';
         }
         if (!formData.idNumber.trim()) {
           newErrors.idNumber = 'ID number is required';
         } else if (formData.idNumber.length < 6 || formData.idNumber.length > 8) {
           newErrors.idNumber = 'ID number should be 6-8 digits';
         }
         break;
       case 2: // Location
         if (!formData.location) {
           newErrors.location = 'Please select a location';
         }
         if (formData.location === 'Other' && !formData.otherLocation.trim()) {
           newErrors.otherLocation = 'Please specify your location';
         }
         break;
     }
 
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };
 
   const handleNext = () => {
     if (validateStep(currentStep)) {
       if (currentStep < STEPS.length - 1) {
         setCurrentStep(currentStep + 1);
       }
     }
   };
 
   const handlePrevious = () => {
     if (currentStep > 0) {
       setCurrentStep(currentStep - 1);
     }
   };
 
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      const finalLocation = formData.location === 'Other' ? formData.otherLocation : formData.location;

      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          idNumber: formData.idNumber,
          location: finalLocation,
          redirectTo: buildSiteUrl('/auth/callback'),
        },
      });

      if (error || !data?.success) {
        const errorMessage = data?.error || error?.message || 'Registration failed';
        const normalized = errorMessage.toLowerCase();

        if (normalized.includes('already exists') || normalized.includes('already registered')) {
          toast({
            title: 'Account Exists',
            description: 'An account with this email already exists. Please sign in.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data?.userId) {
        try {
          localStorage.setItem(
            'pendingSignup',
            JSON.stringify({
              email: formData.email,
              userId: data.userId,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.warn('Could not save pending signup');
        }
      }

      setEmailSent(true);
      toast({
        title: 'Account Created!',
        description: 'Check your email for the verification link.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!formData.email) return;
    setResendLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: formData.email,
          resend: true,
          redirectTo: buildSiteUrl('/auth/callback'),
        },
      });

      if (error || !data?.success) {
        const errorMessage = data?.error || error?.message || 'Failed to resend email';
        toast({
          title: 'Resend Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox (and spam folder).',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend email';
      toast({
        title: 'Resend Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
 
   // Email verification success screen
   if (emailSent) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 flex-col">
         {/* Navigation Header */}
         <div className="w-full max-w-lg mb-6 flex items-center justify-between">
           <a 
             href="/" 
             className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-2 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
             title="Go to home page"
             aria-label="Return to home page"
           >
             <ChevronLeft className="w-4 h-4" />
             Back
           </a>
           <a 
             href="/" 
             className="inline-flex items-center gap-2 font-semibold text-foreground hover:text-primary hover:bg-muted/50 px-3 py-2 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
             title="Return to home page"
             aria-label="Return to home page"
           >
             <Home className="w-4 h-4" />
             <span className="hidden sm:inline">Home</span>
           </a>
         </div>
         
         <Card className="w-full max-w-lg shadow-2xl">
           <CardHeader className="text-center">
             <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center animate-bounce">
               <Mail className="w-8 h-8 text-primary-foreground" />
             </div>
             <CardTitle className="text-2xl">Check Your Email</CardTitle>
             <CardDescription>
               We've sent a verification link to{' '}
               <span className="font-semibold text-foreground">{formData.email}</span>
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
             <div className="bg-muted/50 rounded-xl p-4 space-y-3">
               <div className="flex items-start gap-3">
                 <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                   1
                 </div>
                 <p className="text-sm">Open your email inbox</p>
               </div>
               <div className="flex items-start gap-3">
                 <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                   2
                 </div>
                 <p className="text-sm">Click the verification link</p>
               </div>
               <div className="flex items-start gap-3">
                 <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                   3
                 </div>
                 <p className="text-sm">You'll be redirected to your dashboard</p>
               </div>
             </div>
 
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Go to Sign In
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="w-full"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend verification email
                  </>
                )}
              </Button>
              <div className="text-xs text-center text-muted-foreground space-y-2">
                <p>
                  Didn’t receive email? Check spam, or resend above.
                </p>
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <AlertCircle className="w-3 h-3" />
                  <span>Use the same email you registered with.</span>
                </div>
              </div>
            </div>
           </CardContent>
         </Card>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-muted/20 p-4 sm:p-6 flex-col">
       {/* Navigation Header */}
       <div className="w-full max-w-2xl mb-6 flex items-center justify-between">
         <a 
           href="/" 
           className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-2 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
           title="Go to home page"
           aria-label="Return to home page"
         >
           <ChevronLeft className="w-4 h-4" />
           Back
         </a>
         <a 
           href="/" 
           className="inline-flex items-center gap-2 font-semibold text-foreground hover:text-primary hover:bg-muted/50 px-3 py-2 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
           title="Return to home page"
           aria-label="Return to home page"
         >
           <Home className="w-4 h-4" />
           <span className="hidden sm:inline">Home</span>
         </a>
       </div>
       
       <div className="w-full max-w-2xl space-y-6">
         {/* Header */}
         <div className="text-center space-y-2">
           <div className="flex justify-center mb-4">
             <a 
               href="/" 
               className="inline-block p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
               title="Go to home page"
               aria-label="Turuturu Stars home"
             >
               <img
                 src={turuturuLogo}
                 alt="Turuturu Stars"
                 className="h-14 w-auto"
               />
             </a>
           </div>
           <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
             <Sparkles className="w-6 h-6 text-primary" />
             Join Turuturu Stars
           </h1>
           <p className="text-muted-foreground text-sm">
             Step {currentStep + 1} of {STEPS.length}
           </p>
         </div>
 
         {/* Progress */}
         <Progress value={progress} className="h-2" />
 
         {/* Step indicators - Mobile */}
         <div className="flex justify-center gap-2 sm:hidden">
           {STEPS.map((step, index) => (
             <div
               key={step.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                 index < currentStep
                    ? 'bg-primary text-primary-foreground'
                   : index === currentStep
                    ? 'bg-primary text-primary-foreground'
                   : 'bg-muted text-muted-foreground'
               }`}
             >
               {index < currentStep ? '✓' : index + 1}
             </div>
           ))}
         </div>
 
         {/* Step indicators - Desktop */}
         <div className="hidden sm:grid grid-cols-4 gap-2">
           {STEPS.map((step, index) => {
             const Icon = step.icon;
             return (
               <div
                 key={step.id}
                 className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                   index < currentStep
                    ? 'border-primary bg-primary/10'
                     : index === currentStep
                     ? 'border-primary bg-primary/10'
                     : 'border-muted bg-muted/30'
                 }`}
               >
                 <Icon
                   className={`w-5 h-5 ${
                     index < currentStep
                      ? 'text-primary'
                       : index === currentStep
                       ? 'text-primary'
                       : 'text-muted-foreground'
                   }`}
                 />
                 <span className="text-xs mt-1 font-medium">{step.title}</span>
               </div>
             );
           })}
         </div>
 
         {/* Form Card */}
         <Card className="shadow-xl">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               {(() => {
                 const Icon = STEPS[currentStep].icon;
                 return <Icon className="w-5 h-5 text-primary" />;
               })()}
               {STEPS[currentStep].title}
             </CardTitle>
             <CardDescription>
               {currentStep === 0 && 'Set up your account credentials'}
               {currentStep === 1 && 'Tell us about yourself'}
               {currentStep === 2 && 'Where are you from?'}
               {currentStep === 3 && 'Review and submit your registration'}
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             {/* Step 0: Account */}
             {currentStep === 0 && (
               <>
                 <div className="space-y-2">
                   <Label htmlFor="email">Email Address *</Label>
                   <div className="relative">
                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       id="email"
                       type="email"
                       placeholder="your@email.com"
                       value={formData.email}
                       onChange={(e) => handleChange('email', e.target.value)}
                       className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                     />
                   </div>
                   {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="password">Password *</Label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       id="password"
                       type={showPassword ? 'text' : 'password'}
                       placeholder="••••••••"
                       value={formData.password}
                       onChange={(e) => handleChange('password', e.target.value)}
                       className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                     >
                       {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                   {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="confirmPassword">Confirm Password *</Label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       id="confirmPassword"
                       type={showConfirmPassword ? 'text' : 'password'}
                       placeholder="••••••••"
                       value={formData.confirmPassword}
                       onChange={(e) => handleChange('confirmPassword', e.target.value)}
                       className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
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
               </>
             )}
 
             {/* Step 1: Personal Info */}
             {currentStep === 1 && (
               <>
                 <div className="space-y-2">
                   <Label htmlFor="fullName">Full Name *</Label>
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       id="fullName"
                       placeholder="John Doe"
                       value={formData.fullName}
                       onChange={(e) => handleChange('fullName', e.target.value)}
                       className={`pl-10 ${errors.fullName ? 'border-destructive' : ''}`}
                     />
                   </div>
                   {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="phone">Phone Number *</Label>
                   <div className="relative">
                     <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       id="phone"
                       placeholder="0712345678"
                       value={formData.phone}
                       onChange={(e) => handleChange('phone', e.target.value)}
                       className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                     />
                   </div>
                   {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="idNumber">National ID Number *</Label>
                   <Input
                     id="idNumber"
                     placeholder="12345678"
                     value={formData.idNumber}
                     onChange={(e) => handleChange('idNumber', e.target.value)}
                     className={errors.idNumber ? 'border-destructive' : ''}
                   />
                   {errors.idNumber && <p className="text-sm text-destructive">{errors.idNumber}</p>}
                 </div>
               </>
             )}
 
             {/* Step 2: Location */}
             {currentStep === 2 && (
               <>
                 <div className="space-y-2">
                   <Label>Select Your Location *</Label>
                   <Select
                     value={formData.location}
                     onValueChange={(value) => handleChange('location', value)}
                   >
                     <SelectTrigger className={errors.location ? 'border-destructive' : ''}>
                       <SelectValue placeholder="Choose your area" />
                     </SelectTrigger>
                     <SelectContent>
                       {LOCATIONS.map((loc) => (
                         <SelectItem key={loc} value={loc}>
                           {loc}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                 </div>
 
                 {formData.location === 'Other' && (
                   <div className="space-y-2">
                     <Label htmlFor="otherLocation">Specify Location *</Label>
                     <Input
                       id="otherLocation"
                       placeholder="Enter your location"
                       value={formData.otherLocation}
                       onChange={(e) => handleChange('otherLocation', e.target.value)}
                       className={errors.otherLocation ? 'border-destructive' : ''}
                     />
                     {errors.otherLocation && (
                       <p className="text-sm text-destructive">{errors.otherLocation}</p>
                     )}
                   </div>
                 )}
               </>
             )}
 
             {/* Step 3: Review */}
             {currentStep === 3 && (
               <div className="space-y-4">
                 <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                   <h3 className="font-semibold">Review Your Information</h3>
                   <div className="grid gap-2 text-sm">
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Email:</span>
                       <span className="font-medium">{formData.email}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Full Name:</span>
                       <span className="font-medium">{formData.fullName}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Phone:</span>
                       <span className="font-medium">{formData.phone}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">ID Number:</span>
                       <span className="font-medium">{formData.idNumber}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Location:</span>
                       <span className="font-medium">
                         {formData.location === 'Other' ? formData.otherLocation : formData.location}
                       </span>
                     </div>
                   </div>
                 </div>
 
                 <p className="text-xs text-muted-foreground text-center">
                   By registering, you agree to our terms of service and privacy policy.
                 </p>
               </div>
             )}
 
             {/* Navigation */}
             <div className="flex gap-3 pt-4">
               {currentStep > 0 && (
                 <Button
                   type="button"
                   variant="outline"
                   onClick={handlePrevious}
                   className="flex-1"
                   disabled={isLoading}
                 >
                   <ChevronLeft className="w-4 h-4 mr-1" />
                   Back
                 </Button>
               )}
               {currentStep < STEPS.length - 1 ? (
                 <Button
                   type="button"
                   onClick={handleNext}
                   className="flex-1"
                   disabled={isLoading}
                 >
                   Next
                   <ChevronRight className="w-4 h-4 ml-1" />
                 </Button>
               ) : (
                 <Button
                   type="button"
                   onClick={handleSubmit}
                   className="flex-1"
                   disabled={isLoading}
                 >
                   {isLoading ? (
                     <>
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       Creating Account...
                     </>
                   ) : (
                     <>
                       <CheckCircle2 className="w-4 h-4 mr-2" />
                       Create Account
                     </>
                   )}
                 </Button>
               )}
             </div>
 
             {/* Sign in link */}
             <div className="text-center pt-4 border-t">
               <p className="text-sm text-muted-foreground">
                 Already have an account?{' '}
                 <button
                   onClick={() => navigate('/auth')}
                   className="text-primary hover:underline font-medium"
                 >
                   Sign In
                 </button>
               </p>
             </div>
           </CardContent>
         </Card>
       </div>
       </div>
     </div>
   );
 };
 
 export default RegistrationFlow;
