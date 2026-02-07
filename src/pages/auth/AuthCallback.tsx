import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { buildSiteUrl } from '@/utils/siteUrl';
import { isProfileComplete } from '@/utils/profileCompletion';
import { waitForProfile } from '@/utils/waitForProfile';

/**
 * AuthCallback - Handles OAuth and email verification callbacks
 * Redirects authenticated users to dashboard or registration based on profile completion
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
          }
        }

        // Get session from URL hash (for OAuth callbacks)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/auth', { replace: true }), 2000);
          return;
        }

        if (!session?.user) {
          // No session found, redirect to login
          navigate('/auth', { replace: true });
          return;
        }

        // Wait for profile to be created by trigger (with retries)
        const profile = await waitForProfile(session.user.id, 6, 500);

        // Redirect based on profile completion
        if (isProfileComplete(profile as any)) {
          // Profile complete - go to dashboard
          window.location.href = buildSiteUrl('/dashboard');
        } else {
          // Profile incomplete - go to registration to fill details
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred.');
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-background/80 backdrop-blur-sm rounded-full p-6 border-2 border-primary/20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground animate-pulse">
            Completing authentication...
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
