import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { buildSiteUrl } from '@/utils/siteUrl';
import { isProfileComplete } from '@/utils/profileCompletion';
import { getPendingSignup, clearPendingSignup, verifyEmailAndCompleteProfile } from '@/utils/emailRegistration';

/**
 * Email Confirmation Page
 * 
 * This page handles the email verification callback after user clicks
 * the confirmation link in their email. It's part of the secure registration flow.
 * 
 * URL: https://turuturustars.co.ke/auth/confirm
 * Redirected from: Email confirmation link
 */
const EmailConfirmation = () => {
  usePageMeta({
    title: 'Confirming Your Email - Turuturu Stars',
    description: 'Confirming your email address for your Turuturu Stars account',
    robots: 'noindex,nofollow',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>('confirming');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Check if user session is already established
        // (Supabase automatically processes the confirmation token in the URL)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session?.user) {
          // Session not found - user might need to verify email
          setStatus('error');
          setErrorMessage(
            'Your session has expired. Please try signing up again.'
          );
          setIsLoading(false);
          return;
        }

        // Check if email is verified
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(userError.message);
        }

        if (!user?.email_confirmed_at) {
          // Email not verified yet - might still be processing
          setStatus('error');
          setErrorMessage(
            'Email verification could not be completed. Please check the link and try again, or contact support.'
          );
          setIsLoading(false);
          return;
        }

        // Email is verified!
        setStatus('success');
        toast({
          title: 'Email Verified!',
          description: 'Your email has been confirmed successfully.',
        });

        // Decide next step based on profile completeness
        let nextPath = '/dashboard';
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, id_number')
            .eq('id', user.id)
            .maybeSingle();

          if (!isProfileComplete(profile as any)) {
            const pending = getPendingSignup();
            const metadata = user.user_metadata || {};
            const fullName = pending?.fullName || (metadata.full_name as string) || 'Member';
            const phone = pending?.phone || (metadata.phone as string) || '0000000000';
            const idNumber = pending?.idNumber || (metadata.id_number as string) || '';
            const location = pending?.location || (metadata.location as string) || '';

            if (fullName && phone) {
              const result = await verifyEmailAndCompleteProfile(user.id, {
                fullName,
                phone,
                idNumber,
                location,
                occupation: (metadata.occupation as string) || undefined,
                isStudent: Boolean(metadata.is_student),
              });
              if (result.success) {
                clearPendingSignup();
                nextPath = '/dashboard';
              } else {
                console.warn('Profile completion after email confirm failed:', result.error);
                nextPath = '/auth';
              }
            } else {
              nextPath = '/auth';
            }
          }
        } catch (profileCheckError) {
          console.warn('Email confirmation profile check failed:', profileCheckError);
        }

        setTimeout(() => {
          window.location.href = buildSiteUrl(nextPath);
        }, 2500);
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Email confirmation failed. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Give Supabase a moment to process the confirmation token
    const timer = setTimeout(confirmEmail, 1000);
    return () => clearTimeout(timer);
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-hero">
        <CardHeader className="text-center space-y-4">
          {isLoading ? (
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative bg-background/80 backdrop-blur-sm rounded-full p-6 border-2 border-primary/20">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              </div>
            </div>
          ) : status === 'success' ? (
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
          )}
          <div>
            <CardTitle className="text-2xl">
              {isLoading && 'Confirming Your Email'}
              {status === 'success' && 'Email Confirmed!'}
              {status === 'error' && 'Confirmation Failed'}
            </CardTitle>
            <CardDescription className="mt-2">
              {isLoading && 'Please wait while we verify your email address...'}
              {status === 'success' && 'Your email has been successfully verified'}
              {status === 'error' && 'There was an issue confirming your email'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === 'success' && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-300">
                Email verified successfully! Redirecting you to your dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-300">
                  {errorMessage}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/register', { replace: true })}
                  className="w-full"
                >
                  Return to Registration
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth', { replace: true })}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                If the problem persists, please contact support at support@turuturustars.co.ke
              </p>
            </div>
          )}

          {isLoading && (
            <p className="text-sm text-muted-foreground text-center">
              This may take a few moments...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmation;

