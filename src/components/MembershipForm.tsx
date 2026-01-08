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
import { UserPlus, CheckCircle, Loader2 } from 'lucide-react';

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
      <section id="register" className="py-20 bg-primary">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl p-12 shadow-xl animate-fade-in">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4">
                Welcome to the Family!
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Your registration has been received. A member of our team will contact you soon 
                with more information about joining Turuturu Stars CBO.
              </p>
              <p className="text-primary font-semibold italic">
                "East or West, Turuturu is Home"
              </p>
              <Button
                onClick={() => setIsSuccess(false)}
                variant="outline"
                className="mt-6"
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
    <section id="register" className="py-20 bg-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 animate-fade-in">
            <span className="text-primary-foreground/80 font-semibold text-sm uppercase tracking-wider">
              Join Us
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-4">
              Become a Member
            </h2>
            <div className="w-24 h-1 bg-primary-foreground/30 mx-auto mb-6"></div>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
              Join our growing family of over 200 members. Together we stand, together we build a lasting legacy.
            </p>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl animate-fade-in">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-foreground font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    {...register('full_name')}
                    className={errors.full_name ? 'border-destructive' : ''}
                  />
                  {errors.full_name && (
                    <p className="text-destructive text-sm">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground font-medium">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+254 700 000 000"
                    {...register('phone')}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && (
                    <p className="text-destructive text-sm">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-foreground font-medium">
                    Location *
                  </Label>
                  <Input
                    id="location"
                    placeholder="Kigumo, Murang'a County"
                    {...register('location')}
                    className={errors.location ? 'border-destructive' : ''}
                  />
                  {errors.location && (
                    <p className="text-destructive text-sm">{errors.location.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-foreground font-medium">
                  Occupation (Optional)
                </Label>
                <Input
                  id="occupation"
                  placeholder="Teacher, Engineer, Farmer, etc."
                  {...register('occupation')}
                  className={errors.occupation ? 'border-destructive' : ''}
                />
                {errors.occupation && (
                  <p className="text-destructive text-sm">{errors.occupation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground font-medium">
                  Why do you want to join? (Optional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Share your motivation for joining Turuturu Stars CBO..."
                  rows={4}
                  {...register('message')}
                  className={errors.message ? 'border-destructive' : ''}
                />
                {errors.message && (
                  <p className="text-destructive text-sm">{errors.message.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Register as Member
                  </>
                )}
              </Button>

              <p className="text-center text-muted-foreground text-sm">
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
