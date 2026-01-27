import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Loader2 } from 'lucide-react';
import StepByStepRegistration from '@/components/auth/StepByStepRegistration';

/**
 * Register Page - Interactive Step-by-Step Registration
 * 
 * This page provides an engaging, question-by-question registration experience.
 * Users are guided through their information step by step with optional fields
 * they can skip if they prefer to add later.
 * 
 * Features:
 * - 6-step guided registration process
 * - Progressive disclosure of questions
 * - Skip optional steps
 * - Beautiful animations and visual feedback
 * - Mobile-optimized experience
 */
const Register = () => {
  usePageMeta({
    title: 'Join Turuturu Stars | Interactive Registration',
    description: 'Create your account to become a member of Turuturu Stars Community. Sign up with our interactive, step-by-step registration process.',
    keywords: ['sign up', 'register', 'membership', 'Turuturu Stars', 'interactive registration'],
    canonicalUrl: 'https://turuturustars.co.ke/register',
    robots: 'index,follow'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is already authenticated - proceed with profile setup
          setUser({ id: session.user.id, email: session.user.email });
          setIsLoading(false);
        } else {
          // Not authenticated - redirect to auth page for signup
          navigate('/auth?mode=signup', { replace: true });
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // Default to redirecting to auth on error
        navigate('/auth?mode=signup', { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

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
          <p className="text-sm text-muted-foreground animate-pulse">Loading registration...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show profile setup
  if (user) {
    return <StepByStepRegistration user={user} />;
  }

  // Not authenticated - redirect to auth to sign up
  // useEffect will handle navigation on mount
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to sign up...</p>
      </div>
    </div>
  );
};

export default Register;


