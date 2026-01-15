import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const membershipSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15, 'Phone number is too long'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location is too long'),
  occupation: z.string().max(100, 'Occupation is too long').optional(),
  message: z.string().max(500, 'Message is too long').optional(),
});

type MembershipFormData = z.infer<typeof membershipSchema>;

const MembershipForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const { ref } = useScrollAnimation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MembershipFormData>({
    resolver: zodResolver(membershipSchema),
  });

  const onSubmit = async (data: MembershipFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('members').insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        location: data.location,
        occupation: data.occupation || null,
        message: data.message || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already registered",
            description: "This email address is already registered. We'll be in touch soon!",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setIsSuccess(true);
      reset();
      toast({
        title: "Registration successful!",
        description: "Welcome to the Turuturu Stars family. We'll be in touch soon!",
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section id="register" className="py-20 bg-gradient-to-br from-primary to-primary/90 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-primary-foreground/5 rounded-full blur-3xl animate-float animation-delay-300" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl p-12 shadow-elevated animate-scale-up">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <CheckCircle className="w-24 h-24 text-green-500 animate-bounce-slow" />
                  <Sparkles className="w-6 h-6 text-gold absolute top-0 right-0 animate-spin-slow" />
                </div>
              </div>
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4 animate-fade-up">
                Welcome to the Family!
              </h2>
              <p className="text-muted-foreground text-lg mb-6 animate-fade-up animation-delay-100">
                Your registration has been received. A member of our team will contact you soon 
                with more information about joining Turuturu Stars CBO.
              </p>
              <p className="text-primary font-semibold italic animate-fade-up animation-delay-200">
                "East or West, Turuturu is Home"
              </p>
              <Button
                onClick={() => setIsSuccess(false)}
                variant="outline"
                className="mt-6 animate-fade-up animation-delay-300"
              >
                Register Another Member
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      ref={ref}
      id="register" 
      className="py-20 bg-gradient-to-br from-primary to-primary/90 relative overflow-hidden"
    >
      {/* Animated decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl animate-pulse animation-delay-200" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl animate-float" />
        <div className="absolute -top-40 -right-40 w-80 h-80 border border-primary-foreground/10 rounded-full animate-spin-slow" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block text-primary-foreground/80 font-semibold text-sm uppercase tracking-wider mb-2 animate-fade-up">
              <Sparkles className="w-4 h-4 inline mr-2 animate-pulse-soft" />
              Join Us
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-4 animate-fade-up animation-delay-100">
              Become a Member
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary-foreground/50 to-transparent mx-auto mb-6 animate-fade-up animation-delay-200" />
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg animate-fade-up animation-delay-300">
              Join our growing family of over 200 members. Together we stand, together we build a lasting legacy.
            </p>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-elevated backdrop-blur-sm animate-fade-up animation-delay-400 hover:shadow-glow transition-all duration-300">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2 animate-fade-up animation-delay-300">
                  <Label htmlFor="full_name" className="text-foreground font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    {...register('full_name')}
                    className={`transition-all duration-300 focus:scale-105 ${errors.full_name ? 'border-destructive' : ''}`}
                  />
                  {errors.full_name && (
                    <p className="text-destructive text-sm animate-fade-up">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2 animate-fade-up animation-delay-400">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...register('email')}
                    className={`transition-all duration-300 focus:scale-105 ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm animate-fade-up">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2 animate-fade-up animation-delay-500">
                  <Label htmlFor="phone" className="text-foreground font-medium">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+254 700 000 000"
                    {...register('phone')}
                    className={`transition-all duration-300 focus:scale-105 ${errors.phone ? 'border-destructive' : ''}`}
                  />
                  {errors.phone && (
                    <p className="text-destructive text-sm animate-fade-up">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2 animate-fade-up animation-delay-600">
                  <Label htmlFor="location" className="text-foreground font-medium">
                    Location *
                  </Label>
                  <Input
                    id="location"
                    placeholder="Kigumo, Murang'a County"
                    {...register('location')}
                    className={`transition-all duration-300 focus:scale-105 ${errors.location ? 'border-destructive' : ''}`}
                  />
                  {errors.location && (
                    <p className="text-destructive text-sm animate-fade-up">{errors.location.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 animate-fade-up animation-delay-300">
                <Label htmlFor="occupation" className="text-foreground font-medium">
                  Occupation (Optional)
                </Label>
                <Input
                  id="occupation"
                  placeholder="Teacher, Engineer, Farmer, etc."
                  {...register('occupation')}
                  className={`transition-all duration-300 focus:scale-105 ${errors.occupation ? 'border-destructive' : ''}`}
                />
                {errors.occupation && (
                  <p className="text-destructive text-sm animate-fade-up">{errors.occupation.message}</p>
                )}
              </div>

              <div className="space-y-2 animate-fade-up animation-delay-400">
                <Label htmlFor="message" className="text-foreground font-medium">
                  Why do you want to join? (Optional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Share your motivation for joining Turuturu Stars CBO..."
                  rows={4}
                  {...register('message')}
                  className={`transition-all duration-300 focus:scale-105 ${errors.message ? 'border-destructive' : ''}`}
                />
                {errors.message && (
                  <p className="text-destructive text-sm animate-fade-up">{errors.message.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-semibold group relative overflow-hidden animate-fade-up animation-delay-500"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2 group-hover:animate-bounce-slow" />
                    Register as Member
                  </>
                )}
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              </Button>

              <p className="text-center text-muted-foreground text-sm animate-fade-up animation-delay-600">
                By registering, you agree to be contacted by Turuturu Stars CBO regarding membership.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MembershipForm;
