import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useToast } from '@/hooks/use-toast';
import { generateRequestId } from '@/utils/requestId';
import { Loader2 } from 'lucide-react';
import { completeProfileViaBackend } from '../utils/completeProfile';
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
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is already authenticated - proceed with profile setup
          setUser({ id: session.user.id, email: session.user.email });
          // If we have a pending signup recorded, optionally ask the backend to create
          // the profile (backend should call supabase service-role safely).
          if (pendingEmail) {
            try {
              await completeProfileViaBackend(pendingEmail);
            } catch (e) {
              console.warn('completeProfileViaBackend failed', e);
            }
            try { localStorage.removeItem('pendingSignup'); } catch (e) {}
            setPendingEmail(null);
          }
          setIsLoading(false);
        } else {
          // Not authenticated - check for pending signup (email confirmation required)
          try {
            const pending = localStorage.getItem('pendingSignup');
            if (pending) {
              const parsed = JSON.parse(pending);
              if (parsed?.email) {
                setPendingEmail(parsed.email);
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            // ignore localStorage errors
          }
          // No pending signup — redirect to auth page for signup
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
  // If there's a pending signup (email confirmation required), show guidance
  if (pendingEmail && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="w-full max-w-lg bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Confirm your email</h2>
          <p className="mb-4 text-sm text-muted-foreground">We sent a confirmation link to <strong>{pendingEmail}</strong>. Please open that email and follow the confirmation link.</p>
          <p className="mb-4 text-sm">After confirming your email, return here and click <strong>"I confirmed"</strong> to continue registration.</p>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-primary text-white rounded"
              onClick={async () => {
                setIsLoading(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session?.user) {
                    setUser({ id: session.user.id, email: session.user.email });
                    try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                    setPendingEmail(null);
                  } else {
                    // Not signed in — navigate to auth to sign in
                    navigate('/auth', { replace: true });
                  }
                } catch (e) {
                  console.error('Error re-checking session:', e);
                  navigate('/auth', { replace: true });
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {isLoading ? 'Checking...' : 'I confirmed'}
            </button>

            <button
              className="px-4 py-2 border rounded"
              onClick={() => {
                // Clear pending and go to sign in
                try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                navigate('/auth', { replace: true });
              }}
            >
              Go to Sign In
            </button>
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm mb-2">Prefer to complete your profile now without signing in?</p>
            {!showCompleteForm ? (
              <button className="px-4 py-2 bg-secondary text-white rounded" onClick={() => setShowCompleteForm(true)}>Complete profile now</button>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!pendingEmail) return;
                  const pending = (() => {
                    try { return JSON.parse(localStorage.getItem('pendingSignup') || '{}'); } catch (e) { return {}; }
                  })();
                  const requestId = pending?.requestId || generateRequestId();
                  try {
                    setIsLoading(true);
                    await completeProfileViaBackend(pendingEmail, { full_name: fullName }, requestId);
                    try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                    setPendingEmail(null);
                    toast({ title: 'Profile Created', description: 'Your profile was created. Please sign in to continue.' });
                    setTimeout(() => navigate('/auth', { replace: true }), 800);
                  } catch (err) {
                    console.error('Complete profile proxy failed', err);
                    toast({ title: 'Could not complete profile', description: 'We will retry automatically. If the problem persists, contact support.', variant: 'destructive' });
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                <div className="space-y-2 mb-3">
                  <label className="block text-sm">Full name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Jane Doe" />
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-primary text-white rounded" type="submit">Submit</button>
                  <button className="px-4 py-2 border rounded" type="button" onClick={() => setShowCompleteForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated and no pending signup — show redirecting loader (useEffect will redirect)
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


