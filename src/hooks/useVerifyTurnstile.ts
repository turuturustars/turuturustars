import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CloudflareVerificationData {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  score?: number;
  score_reason?: string[];
}

interface UseVerifyTurnstileResult {
  isVerifying: boolean;
  error: string | null;
  verify: (token: string) => Promise<boolean>;
  reset: () => void;
}

/**
 * useVerifyTurnstile - Hook to verify Turnstile tokens with backend
 * 
 * Features:
 * - Calls Supabase Edge Function to verify token
 * - Handles errors gracefully
 * - Provides loading state
 * - Returns boolean success status
 * 
 * @returns Object with verification methods
 */
export const useVerifyTurnstile = (): UseVerifyTurnstileResult => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(
    async (token: string): Promise<boolean> => {
      if (!token || !token.trim()) {
        setError('No token provided');
        return false;
      }

      setIsVerifying(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'verify-turnstile',
          {
            body: { token },
          }
        );

        if (functionError) {
          console.error('Function error:', functionError);
          setError('Failed to verify. Please try again.');
          return false;
        }

        if (!data) {
          setError('No response from verification service.');
          return false;
        }

        // Check function response success
        if (!data.success) {
          const errorMessage =
            data.error || 'Verification failed. Please try again.';
          setError(errorMessage);
          console.error('Verification failed:', data);
          return false;
        }

        // Check Cloudflare verification result
        const cloudflareData: CloudflareVerificationData = data.data;
        if (!cloudflareData.success) {
          const errorCodes = cloudflareData.error_codes?.join(', ') || 'Unknown error';
          console.warn('Cloudflare verification failed:', errorCodes);
          setError('Security verification failed. Please try again.');
          return false;
        }

        // Verification successful
        console.log('Token verified successfully');
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Verification failed';
        setError(errorMessage);
        console.error('Verification error:', err);
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsVerifying(false);
    setError(null);
  }, []);

  return {
    isVerifying,
    error,
    verify,
    reset,
  };
};
