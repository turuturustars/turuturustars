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
  const [starterEmail, setStarterEmail] = useState('');

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
          // No pending signup — allow user to start registration here or go to Sign Up
          // Do not force-redirect; show registration starter UI
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // Default to redirecting to auth on error
        setIsLoading(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        <div className="w-full max-w-2xl relative z-10">
          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-8 md:p-12 border border-primary/10">
            {/* Header with icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-full mb-4 animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                Check Your Email
              </h1>
              <p className="text-muted-foreground">We've sent a confirmation link to verify your account</p>
            </div>

            {/* Email display */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Confirmation sent to:</p>
              <p className="text-lg font-semibold text-foreground break-all">{pendingEmail}</p>
            </div>

            {/* Instructions */}
            <div className="space-y-4 mb-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-primary/20 text-primary rounded-full font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="font-semibold text-foreground">Check your inbox</p>
                  <p className="text-sm text-muted-foreground">Open the email we just sent</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-primary/20 text-primary rounded-full font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="font-semibold text-foreground">Click the confirmation link</p>
                  <p className="text-sm text-muted-foreground">Follow the link to verify your email</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-primary/20 text-primary rounded-full font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="font-semibold text-foreground">Return here and confirm</p>
                  <p className="text-sm text-muted-foreground">Click "I confirmed" to continue</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <button
                disabled={isLoading}
                className="group relative px-6 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                      setUser({ id: session.user.id, email: session.user.email });
                      try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                      setPendingEmail(null);
                    } else {
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
                <span className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      I Confirmed
                    </>
                  )}
                </span>
              </button>

              <button
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-all duration-300 border border-muted-foreground/20 hover:border-muted-foreground/40"
                onClick={() => {
                  try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                  navigate('/auth', { replace: true });
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Sign In
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Quick profile completion */}
            <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-xl p-6">
              <p className="text-sm font-semibold text-foreground mb-4">✨ Skip email confirmation for now?</p>
              <p className="text-sm text-muted-foreground mb-4">Start filling out your profile while waiting for the confirmation email to arrive.</p>
              
              {!showCompleteForm ? (
                <button
                  className="w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-lg transition-all duration-300 border border-primary/30"
                  onClick={() => setShowCompleteForm(true)}
                >
                  Begin Profile Setup
                </button>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!pendingEmail || !fullName.trim()) {
                      toast({ title: 'Required', description: 'Please enter your full name', variant: 'destructive' });
                      return;
                    }
                    const pending = (() => {
                      try { return JSON.parse(localStorage.getItem('pendingSignup') || '{}'); } catch (e) { return {}; }
                    })();
                    const requestId = pending?.requestId || generateRequestId();
                    try {
                      setIsLoading(true);
                      await completeProfileViaBackend(pendingEmail, { full_name: fullName }, requestId);
                      try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                      setPendingEmail(null);
                      toast({ title: 'Profile Started! 🎉', description: 'Your profile was created. Finishing setup after email confirmation.' });
                      setTimeout(() => navigate('/auth', { replace: true }), 800);
                    } catch (err) {
                      console.error('Complete profile proxy failed', err);
                      toast({ title: 'Could not complete profile', description: 'We will retry automatically. If the problem persists, contact support.', variant: 'destructive' });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background/50 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        'Continue'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCompleteForm(false)}
                      className="flex-1 px-4 py-2 bg-muted text-foreground font-semibold rounded-lg hover:bg-muted/80 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer help text */}
            <div className="mt-8 pt-6 border-t border-border/40 text-center">
              <p className="text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    try { localStorage.removeItem('pendingSignup'); } catch (e) {}
                    navigate('/auth?mode=signup', { replace: true });
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  try signing up again
                </button>
              </p>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Turuturu Stars Community 🌟
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated and no pending signup — let user start registration here
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-muted/20 px-4 sm:px-6 py-10">
      <div className="w-full max-w-xl bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-primary/10">
        <h2 className="text-2xl font-semibold mb-2">Start Registration</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Continue your registration here, or go to the Sign Up page to create an account.
        </p>

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium">Email you signed up with</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={starterEmail}
            onChange={(e) => setStarterEmail(e.target.value)}
            className="w-full border border-border px-4 py-2.5 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="you@email.com"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="px-4 py-2.5 bg-primary text-white rounded-lg font-semibold"
            onClick={() => {
              // Save pending signup locally so Register page can continue as pending
              if (!starterEmail) return toast({ title: 'Email required', description: 'Please enter an email.', variant: 'destructive' });
              const requestId = generateRequestId();
              try { localStorage.setItem('pendingSignup', JSON.stringify({ email: starterEmail, createdAt: Date.now(), requestId })); } catch (e) {}
              setPendingEmail(starterEmail);
            }}
          >
            Continue here
          </button>

          <button className="px-4 py-2.5 border rounded-lg font-semibold" onClick={() => navigate('/auth?mode=signup', { replace: true })}>Go to Sign Up</button>

          <button className="px-4 py-2.5 border rounded-lg font-semibold" onClick={() => navigate('/auth', { replace: true })}>Sign In</button>
        </div>
      </div>
    </div>
  );
};

export default Register;


