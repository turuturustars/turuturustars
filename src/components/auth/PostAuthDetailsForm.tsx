import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, User, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

const detailsSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  idNumber: z.string().min(6, 'Please enter a valid ID number'),
});

interface PostAuthDetailsFormProps {
  onComplete?: () => void;
  user: {
    id: string;
    email?: string;
  };
}

const PostAuthDetailsForm = ({ onComplete, user }: PostAuthDetailsFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'loading' | 'form' | 'complete'>('loading');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    idNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if profile already exists
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, id_number')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.full_name && data.phone && data.id_number) {
          // Profile is complete
          setStep('complete');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else if (data) {
          // Partial profile exists, fill it in
          setFormData({
            fullName: data.full_name || '',
            phone: data.phone || '',
            idNumber: data.id_number || '',
          });
          setStep('form');
        } else {
          // No profile, show form
          setStep('form');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setStep('form');
      }
    };

    checkExistingProfile();
  }, [user.id, navigate]);

  const validateForm = () => {
    try {
      detailsSchema.parse(formData);
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

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          id_number: formData.idNumber,
          email: user.email,
          status: 'pending',
        }, { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: 'Profile Completed',
        description: 'Your profile has been set up successfully!',
      });

      setStep('complete');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const skipForNow = () => {
    toast({
      title: 'Profile Setup Skipped',
      description: 'You can complete your profile later in settings',
    });
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-background/80 backdrop-blur-sm rounded-full p-6 border-2 border-primary/20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-2 border-green-200 dark:border-green-900">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/30 rounded-full blur-lg animate-pulse" />
              <div className="relative bg-green-50 dark:bg-green-950/50 rounded-full p-4 border-2 border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground">Welcome!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Your profile is ready. Redirecting to dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>Help us get to know you better.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={errors.fullName ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="+254 700 000 000"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={errors.phone ? 'border-destructive' : ''}
                  disabled={isLoading}
                  type="tel"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber" className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  ID Number
                </Label>
                <Input
                  id="idNumber"
                  placeholder="Your ID number"
                  value={formData.idNumber}
                  onChange={(e) => handleChange('idNumber', e.target.value)}
                  className={errors.idNumber ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.idNumber && <p className="text-xs text-destructive">{errors.idNumber}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={skipForNow}
                disabled={isLoading}
                className="flex-1"
              >
                Skip for Now
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You can update your profile anytime in your dashboard settings.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostAuthDetailsForm;
