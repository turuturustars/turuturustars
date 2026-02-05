/**
 * Email Verification Component
 * Handles email verification status checking and resend functionality
 */

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildSiteUrl } from '@/utils/siteUrl';
import { resendVerificationEmail } from '@/lib/authService';

interface EmailVerificationProps {
  email: string;
  userId: string;
  onVerified?: () => void;
  onResendEmail?: () => Promise<void>;
  autoCheckInterval?: number; // in seconds
}

export const EmailVerification = ({
  email,
  userId,
  onVerified,
  onResendEmail,
  autoCheckInterval = 5,
}: EmailVerificationProps) => {
  const { toast } = useToast();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [checkAttempts, setCheckAttempts] = useState(0);

  // Check email verification status periodically
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          console.warn('Failed to get user:', error);
          return;
        }

        if (user.email_confirmed_at) {
          setIsVerified(true);
          onVerified?.();
          return;
        }

        setCheckAttempts(prev => prev + 1);
      } catch (error) {
        console.error('Verification check failed:', error);
      }
    };

    // Initial check
    checkVerification();

    // Set up polling
    const interval = setInterval(checkVerification, autoCheckInterval * 1000);

    return () => clearInterval(interval);
  }, [onVerified, autoCheckInterval]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !showResendButton && checkAttempts > 0) {
      setShowResendButton(true);
    }
  }, [resendCountdown, showResendButton, checkAttempts]);

  const handleResendEmail = async () => {
    setIsLoading(true);
    setShowResendButton(false);
    setResendCountdown(300); // 5 minutes

    try {
      // Use custom onResendEmail handler if provided
      if (onResendEmail) {
        await onResendEmail();
      } else {
        await resendVerificationEmail(email, buildSiteUrl('/auth/callback'));
      }

      toast({
        title: 'Email Sent',
        description: `Verification link sent to ${email}`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to resend email';
      toast({
        title: 'Failed to Resend',
        description: errorMsg,
        variant: 'destructive',
      });
      setShowResendButton(true);
      setResendCountdown(0);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        <div>
          <p className="font-medium text-green-900 dark:text-green-100">Email Verified!</p>
          <p className="text-sm text-green-800 dark:text-green-200">Your email has been successfully verified</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-900 dark:text-amber-100">Email Verification Required</p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            We sent a confirmation link to <span className="font-semibold">{email}</span>
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Check your spam/junk folder if you don't see it. The link expires in 24 hours.
          </p>
        </div>
      </div>

      {showResendButton && (
        <Button
          onClick={handleResendEmail}
          variant="outline"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Resend Verification Email
            </>
          )}
        </Button>
      )}

      {resendCountdown > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Resend available in {Math.ceil(resendCountdown / 60)}:{String(resendCountdown % 60).padStart(2, '0')}
        </p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Already clicked the link? <span className="text-primary font-medium cursor-pointer">Refresh this page</span>
      </p>
    </div>
  );
};

export default EmailVerification;
