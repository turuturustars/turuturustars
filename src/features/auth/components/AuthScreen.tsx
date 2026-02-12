import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Home, Loader2, Mail, Lock, User, Phone, MapPin, ShieldCheck, KeyRound, PhoneCall } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { requestPasswordResetByIdentifier, signInWithEmail, signUpWithEmail } from '../authApi';
import TurnstileWidget from '@/components/auth/TurnstileWidget';
import { useVerifyTurnstile } from '@/hooks/useVerifyTurnstile';

type Mode = 'signin' | 'signup';

const SUPPORT_PHONE = '0700471113';

interface AuthScreenProps {
  defaultMode?: Mode;
  redirectPath?: string;
}

export const AuthScreen = ({ defaultMode = 'signin', redirectPath = '/dashboard/home' }: AuthScreenProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { status } = useAuth();
  const turnstileSiteKey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY || import.meta.env.VITE_CLOUDFLARE_SITE_KEY || '';
  const hasCaptchaProtection = Boolean(turnstileSiteKey);
  const { verify: verifyTurnstileToken, isVerifying, error: manualCheckError, reset: resetManualCheck } =
    useVerifyTurnstile();

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupAcknowledged, setSignupAcknowledged] = useState(false);
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);
  const [signupCaptchaToken, setSignupCaptchaToken] = useState<string | null>(null);
  const [loginCaptchaResetSignal, setLoginCaptchaResetSignal] = useState(0);
  const [signupCaptchaResetSignal, setSignupCaptchaResetSignal] = useState(0);
  const [requiresManualCheck, setRequiresManualCheck] = useState({ signin: false, signup: false });
  const [manualCheckPassed, setManualCheckPassed] = useState({ signin: false, signup: false });
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryCaptchaToken, setRecoveryCaptchaToken] = useState<string | null>(null);
  const [recoveryCaptchaResetSignal, setRecoveryCaptchaResetSignal] = useState(0);
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);
  const [recoveryFeedback, setRecoveryFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    supportPhone?: string;
    emailHint?: string | null;
  } | null>(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    idNumber: '',
    location: '',
  });

  useEffect(() => {
    if (status === 'ready' || status === 'pending-approval' || status === 'suspended') {
      navigate(redirectPath, { replace: true });
    } else if (status === 'needs-profile') {
      navigate('/profile-setup', {
        replace: true,
        state: { from: { pathname: redirectPath } },
      });
    }
  }, [navigate, status, redirectPath]);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'forgot') {
      setMode('signin');
      setShowRecoveryPanel(true);
      const identifier = searchParams.get('identifier');
      if (identifier) {
        setRecoveryIdentifier(identifier);
      }
    }
  }, [searchParams]);

  const isPotentialCaptchaServerError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const statusCode = typeof error === 'object' && error !== null ? (error as { status?: number }).status : undefined;
    const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
    return (
      statusCode === 500 ||
      code === 'unexpected_failure' ||
      message.includes('captcha') ||
      message.includes('unexpected failure')
    );
  };

  const handleLoginCaptchaChange = useCallback((token: string | null) => {
    setLoginCaptchaToken(token);
    setManualCheckPassed((prev) => ({ ...prev, signin: false }));
    resetManualCheck();
  }, [resetManualCheck]);

  const handleSignupCaptchaChange = useCallback((token: string | null) => {
    setSignupCaptchaToken(token);
    setManualCheckPassed((prev) => ({ ...prev, signup: false }));
    resetManualCheck();
  }, [resetManualCheck]);

  const handleRecoveryCaptchaChange = useCallback((token: string | null) => {
    setRecoveryCaptchaToken(token);
  }, []);

  const openRecoveryPanel = useCallback(
    (prefillIdentifier?: string) => {
      setMode('signin');
      setShowRecoveryPanel(true);
      setRecoveryFeedback(null);
      if (prefillIdentifier) {
        setRecoveryIdentifier(prefillIdentifier.trim());
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('mode', 'forgot');
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const closeRecoveryPanel = useCallback(() => {
    setShowRecoveryPanel(false);
    setRecoveryFeedback(null);
    setRecoveryCaptchaToken(null);
    setRecoveryCaptchaResetSignal((prev) => prev + 1);

    const nextParams = new URLSearchParams(searchParams);
    if (nextParams.get('mode') === 'forgot') {
      nextParams.delete('mode');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const looksLikeExistingAccountError = (message: string) => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('already registered') ||
      normalized.includes('already exists') ||
      normalized.includes('account already') ||
      normalized.includes('email already')
    );
  };

  const handleManualLoginCheck = async () => {
    if (!loginCaptchaToken) return;
    const verified = await verifyTurnstileToken(loginCaptchaToken);
    if (verified) {
      setManualCheckPassed((prev) => ({ ...prev, signin: true }));
      toast({
        title: 'Security check passed',
        description: 'Cloudflare manual verification succeeded. You can try signing in again.',
      });
    }
  };

  const handleManualSignupCheck = async () => {
    if (!signupCaptchaToken) return;
    const verified = await verifyTurnstileToken(signupCaptchaToken);
    if (verified) {
      setManualCheckPassed((prev) => ({ ...prev, signup: true }));
      toast({
        title: 'Security check passed',
        description: 'Cloudflare manual verification succeeded. You can try creating your account again.',
      });
    }
  };

  const recoveryButtonLabel = useMemo(() => {
    if (isRecoverySubmitting) return 'Checking account...';
    if (recoveryFeedback?.type === 'success') return 'Send another reset link';
    return 'Check account and send reset link';
  }, [isRecoverySubmitting, recoveryFeedback?.type]);

  const handlePasswordRecovery = async () => {
    if (!recoveryIdentifier.trim()) {
      toast({
        title: 'Missing identifier',
        description: 'Enter your email or TS membership number to recover your account.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasCaptchaProtection || !recoveryCaptchaToken) {
      toast({
        title: 'Complete security check',
        description: 'Please complete Cloudflare verification before continuing.',
        variant: 'destructive',
      });
      return;
    }

    setIsRecoverySubmitting(true);
    try {
      const response = await requestPasswordResetByIdentifier({
        identifier: recoveryIdentifier.trim(),
        captchaToken: recoveryCaptchaToken,
      });

      if (response.resetSent) {
        setRecoveryFeedback({
          type: 'success',
          message: response.message,
          supportPhone: response.supportPhone,
          emailHint: response.emailHint,
        });
        toast({
          title: 'Reset link sent',
          description: response.emailHint
            ? `We sent the reset link to ${response.emailHint}.`
            : response.message,
        });
      } else if (response.exists) {
        setRecoveryFeedback({
          type: 'info',
          message: response.message,
          supportPhone: response.supportPhone,
          emailHint: response.emailHint,
        });
        toast({
          title: 'Account found',
          description: response.message,
        });
      } else {
        setRecoveryFeedback({
          type: 'error',
          message: response.message,
          supportPhone: response.supportPhone,
        });
        toast({
          title: 'Account not found',
          description: `${response.message} Support: ${response.supportPhone}.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process recovery request.';
      setRecoveryFeedback({ type: 'error', message, supportPhone: SUPPORT_PHONE });
      toast({
        title: 'Recovery failed',
        description: `${message} Support: ${SUPPORT_PHONE}.`,
        variant: 'destructive',
      });
    } finally {
      setRecoveryCaptchaToken(null);
      setRecoveryCaptchaResetSignal((prev) => prev + 1);
      setIsRecoverySubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCaptchaProtection) {
      toast({
        title: 'Security configuration missing',
        description: 'Captcha site key is not configured on this deployment. Contact admin to restore sign-in.',
        variant: 'destructive',
      });
      return;
    }

    if (hasCaptchaProtection && !loginCaptchaToken) {
      toast({
        title: 'Complete security check',
        description: 'Please complete the verification to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (requiresManualCheck.signin && !manualCheckPassed.signin) {
      toast({
        title: 'Manual Cloudflare check required',
        description: 'Run manual verification below, then try signing in again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmail({
        ...loginForm,
        captchaToken: loginCaptchaToken || undefined,
      });
      setRequiresManualCheck((prev) => ({ ...prev, signin: false }));
      setManualCheckPassed((prev) => ({ ...prev, signin: false }));
      toast({ title: 'Welcome back', description: 'You are now signed in.' });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      if (isPotentialCaptchaServerError(error) && loginCaptchaToken) {
        const configHint = message.toLowerCase().includes('captcha verification process failed')
          ? ' Supabase captcha provider appears misconfigured; admin should re-save Turnstile secret in Auth > Attack Protection.'
          : '';
        setRequiresManualCheck((prev) => ({ ...prev, signin: true }));
        toast({
          title: 'Automatic verification failed',
          description: `Use the Cloudflare manual check button, then sign in again.${configHint}`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Unable to sign in', description: message, variant: 'destructive' });
      }
    } finally {
      if (hasCaptchaProtection) {
        setLoginCaptchaToken(null);
        setLoginCaptchaResetSignal((prev) => prev + 1);
        setManualCheckPassed((prev) => ({ ...prev, signin: false }));
      }
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCaptchaProtection) {
      toast({
        title: 'Security configuration missing',
        description: 'Captcha site key is not configured on this deployment. Contact admin to restore sign-up.',
        variant: 'destructive',
      });
      return;
    }

    if (!signupForm.email || !signupForm.password || signupForm.password.length < 8) {
      toast({
        title: 'Missing details',
        description: 'Email and an 8+ character password are required.',
        variant: 'destructive',
      });
      return;
    }

    if (hasCaptchaProtection && !signupCaptchaToken) {
      toast({
        title: 'Complete security check',
        description: 'Please complete the verification to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (requiresManualCheck.signup && !manualCheckPassed.signup) {
      toast({
        title: 'Manual Cloudflare check required',
        description: 'Run manual verification below, then try creating your account again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { requiresEmailVerification, existingUserHint } = await signUpWithEmail({
        email: signupForm.email,
        password: signupForm.password,
        fullName: signupForm.fullName,
        phone: signupForm.phone,
        idNumber: signupForm.idNumber,
        location: signupForm.location,
        captchaToken: signupCaptchaToken || undefined,
      });

      if (existingUserHint) {
        setMode('signin');
        setLoginForm((prev) => ({ ...prev, email: signupForm.email }));
        openRecoveryPanel(signupForm.email);
        toast({
          title: 'Account already exists',
          description: `This email is already registered. Use password recovery or call support ${SUPPORT_PHONE}.`,
          variant: 'destructive',
        });
        return;
      }

      setRequiresManualCheck((prev) => ({ ...prev, signup: false }));
      setManualCheckPassed((prev) => ({ ...prev, signup: false }));
      setSignupAcknowledged(true);
      if (requiresEmailVerification) {
        toast({
          title: 'Verify your email',
          description: 'We sent a confirmation link. Click it to finish signing up.',
        });
      } else {
        toast({
          title: 'Account created',
          description: 'You are signed in. Complete your profile next.',
        });
        navigate('/profile-setup', { replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      if (looksLikeExistingAccountError(message)) {
        setMode('signin');
        setLoginForm((prev) => ({ ...prev, email: signupForm.email }));
        openRecoveryPanel(signupForm.email);
        toast({
          title: 'Account already exists',
          description: `An account with this email already exists. Recover your password or call ${SUPPORT_PHONE}.`,
          variant: 'destructive',
        });
        return;
      }

      if (isPotentialCaptchaServerError(error) && signupCaptchaToken) {
        const configHint = message.toLowerCase().includes('captcha verification process failed')
          ? ' Supabase captcha provider appears misconfigured; admin should re-save Turnstile secret in Auth > Attack Protection.'
          : '';
        setRequiresManualCheck((prev) => ({ ...prev, signup: true }));
        toast({
          title: 'Automatic verification failed',
          description: `Use the Cloudflare manual check button, then try account creation again.${configHint}`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Unable to sign up', description: message, variant: 'destructive' });
      }
    } finally {
      if (hasCaptchaProtection) {
        setSignupCaptchaToken(null);
        setSignupCaptchaResetSignal((prev) => prev + 1);
        setManualCheckPassed((prev) => ({ ...prev, signup: false }));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-background via-primary/5 to-blue-50/60 flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-primary/30 via-blue-500/25 to-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 left-[-5%] h-[360px] w-[360px] rounded-full bg-gradient-to-br from-primary/20 via-blue-500/15 to-transparent blur-3xl" />

      <Card className="relative w-full max-w-5xl overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/95 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/10" />

        <div className="relative grid md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden flex-col justify-between gap-10 border-r border-border/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-10 md:flex">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_60%)]" />
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                Trusted member access
              </div>
              <h1 className="font-serif text-4xl leading-tight text-transparent bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text">
                Hello, welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to manage your contributions, profile, and community updates with the same
                premium look as your dashboard.
              </p>
            </div>
            <div className="relative z-10 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-cyan-500" />
                Secure email authentication powered by your Supabase stack.
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-cyan-500" />
                Streamlined onboarding with profile setup after sign up.
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-cyan-500" />
                Consistent color gradients that mirror the dashboard experience.
              </div>
            </div>
          </div>

          <div className="relative p-6 sm:p-8 md:p-10">
            <div className="mb-5 flex items-center justify-between gap-2">
              <Button asChild type="button" variant="outline" size="sm" className="rounded-full border-border/60 bg-background/60">
                <Link to="/" className="inline-flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>

            <div className="mb-6 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:hidden">
                <ShieldCheck className="h-4 w-4" />
                Account access
              </div>
              <h2 className="text-3xl font-semibold text-transparent bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text">
                Account Access
              </h2>
              <p className="text-sm text-muted-foreground">
                Securely sign in or create your Turuturu Stars account. Email delivery is powered by
                your Supabase + Brevo setup.
              </p>
            </div>

            {!hasCaptchaProtection && (
              <Alert className="mb-5 border-amber-400/50 bg-amber-50/80 text-amber-900">
                <AlertDescription>
                  Bot protection is not configured. Add `VITE_CLOUDFLARE_SITE_KEY` to enable Turnstile verification.
                </AlertDescription>
              </Alert>
            )}

            <Tabs
              value={mode}
              onValueChange={(val) => {
                const nextMode = val as Mode;
                setMode(nextMode);
                if (nextMode === 'signup' && showRecoveryPanel) {
                  closeRecoveryPanel();
                }
              }}
              className="space-y-6"
            >
              <TabsList className="grid grid-cols-2 rounded-full border border-border/60 bg-muted/60 p-1">
                <TabsTrigger
                  value="signin"
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form className="space-y-5" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-foreground/80">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        required
                        className="pl-9 border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-foreground/80">
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => openRecoveryPanel(loginForm.email)}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="pl-9 border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>

                  {showRecoveryPanel && (
                    <Alert className="border-primary/30 bg-primary/5">
                      <AlertDescription>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                              <KeyRound className="h-4 w-4 text-primary" />
                              Recover account
                            </div>
                            <button
                              type="button"
                              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                              onClick={closeRecoveryPanel}
                            >
                              Close
                            </button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="recovery-identifier" className="text-xs font-medium text-foreground/80">
                              Email or TS membership number
                            </Label>
                            <Input
                              id="recovery-identifier"
                              type="text"
                              placeholder="name@example.com or TS-00001"
                              className="border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                              value={recoveryIdentifier}
                              onChange={(e) => {
                                setRecoveryIdentifier(e.target.value);
                                setRecoveryFeedback(null);
                              }}
                              disabled={isRecoverySubmitting}
                            />
                          </div>

                          {hasCaptchaProtection && (
                            <TurnstileWidget
                              siteKey={turnstileSiteKey}
                              action="password_recovery"
                              resetSignal={recoveryCaptchaResetSignal}
                              onTokenChange={handleRecoveryCaptchaChange}
                            />
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-primary/40 bg-background/80 text-primary hover:bg-primary/10"
                            onClick={() => void handlePasswordRecovery()}
                            disabled={isRecoverySubmitting || !hasCaptchaProtection || !recoveryCaptchaToken}
                          >
                            {isRecoverySubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              recoveryButtonLabel
                            )}
                          </Button>

                          <p className="text-[11px] text-muted-foreground">
                            Need help? Call support <span className="font-semibold text-foreground">{SUPPORT_PHONE}</span>.
                          </p>

                          {recoveryFeedback && (
                            <div
                              className={`rounded-lg border px-3 py-2 text-xs ${
                                recoveryFeedback.type === 'success'
                                  ? 'border-emerald-300/70 bg-emerald-50 text-emerald-800'
                                  : recoveryFeedback.type === 'info'
                                    ? 'border-blue-300/70 bg-blue-50 text-blue-800'
                                    : 'border-amber-300/70 bg-amber-50 text-amber-900'
                              }`}
                            >
                              <p>{recoveryFeedback.message}</p>
                              {recoveryFeedback.emailHint && (
                                <p className="mt-1 font-medium">
                                  Reset link destination: {recoveryFeedback.emailHint}
                                </p>
                              )}
                              <p className="mt-2 inline-flex items-center gap-1 font-semibold">
                                <PhoneCall className="h-3.5 w-3.5" />
                                Support: {recoveryFeedback.supportPhone || SUPPORT_PHONE}
                              </p>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {hasCaptchaProtection && (
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      action="signin"
                      resetSignal={loginCaptchaResetSignal}
                      onTokenChange={handleLoginCaptchaChange}
                    />
                  )}

                  {requiresManualCheck.signin && (
                    <Alert className="border-amber-400/50 bg-amber-50/80 text-amber-900">
                      <AlertDescription className="space-y-3">
                        <p className="text-sm">
                          Automatic Turnstile validation failed. Run a manual Cloudflare check, then sign in again.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-amber-300 bg-amber-100/80 text-amber-900 hover:bg-amber-200"
                          onClick={handleManualLoginCheck}
                          disabled={isVerifying || !loginCaptchaToken}
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Checking...
                            </>
                          ) : manualCheckPassed.signin ? (
                            'Cloudflare check passed'
                          ) : (
                            'Run Cloudflare manual check'
                          )}
                        </Button>
                        {manualCheckError && <p className="text-xs text-destructive">{manualCheckError}</p>}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary via-blue-600 to-cyan-600 text-white shadow-lg shadow-primary/20 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700"
                    disabled={
                      isSubmitting ||
                      !hasCaptchaProtection ||
                      !loginCaptchaToken ||
                      (requiresManualCheck.signin && !manualCheckPassed.signin)
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {signupAcknowledged && (
                  <Alert className="mb-5 border-primary/20 bg-primary/5">
                    <AlertDescription>
                      We created your account. Check your email for the confirmation link. After
                      confirming, sign back in and complete your profile.
                    </AlertDescription>
                  </Alert>
                )}

                <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSignup}>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground/80">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        className="pl-9 border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground/80">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        required
                        minLength={8}
                        className="pl-9 border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname" className="text-sm font-medium text-foreground/80">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-fullname"
                        required
                        className="pl-9 border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                        value={signupForm.fullName}
                        onChange={(e) => setSignupForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-sm font-medium text-foreground/80">
                      Phone
                    </Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        placeholder="+2547..."
                        className="pl-9 border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-id" className="text-sm font-medium text-foreground/80">
                      National ID
                    </Label>
                    <Input
                      id="signup-id"
                      className="border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                      value={signupForm.idNumber}
                      onChange={(e) => setSignupForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="signup-location" className="text-sm font-medium text-foreground/80">
                      Location
                    </Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-location"
                        className="pl-9 border-border/60 bg-background/70 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition"
                        value={signupForm.location}
                        onChange={(e) => setSignupForm((prev) => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>

                  {hasCaptchaProtection && (
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      action="signup"
                      resetSignal={signupCaptchaResetSignal}
                      onTokenChange={handleSignupCaptchaChange}
                      className="md:col-span-2"
                    />
                  )}

                  {requiresManualCheck.signup && (
                    <Alert className="md:col-span-2 border-amber-400/50 bg-amber-50/80 text-amber-900">
                      <AlertDescription className="space-y-3">
                        <p className="text-sm">
                          Automatic Turnstile validation failed. Run a manual Cloudflare check, then submit again.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-amber-300 bg-amber-100/80 text-amber-900 hover:bg-amber-200"
                          onClick={handleManualSignupCheck}
                          disabled={isVerifying || !signupCaptchaToken}
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Checking...
                            </>
                          ) : manualCheckPassed.signup ? (
                            'Cloudflare check passed'
                          ) : (
                            'Run Cloudflare manual check'
                          )}
                        </Button>
                        {manualCheckError && <p className="text-xs text-destructive">{manualCheckError}</p>}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full md:col-span-2 bg-gradient-to-r from-primary via-blue-600 to-cyan-600 text-white shadow-lg shadow-primary/20 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700"
                    disabled={
                      isSubmitting ||
                      !hasCaptchaProtection ||
                      !signupCaptchaToken ||
                      (requiresManualCheck.signup && !manualCheckPassed.signup)
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuthScreen;
