import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { signInWithEmail, signUpWithEmail } from '../authApi';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  defaultMode?: Mode;
  redirectPath?: string;
}

export const AuthScreen = ({ defaultMode = 'signin', redirectPath = '/dashboard/home' }: AuthScreenProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status } = useAuth();

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupAcknowledged, setSignupAcknowledged] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmail(loginForm);
      toast({ title: 'Welcome back', description: 'You are now signed in.' });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      toast({ title: 'Unable to sign in', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.email || !signupForm.password || signupForm.password.length < 8) {
      toast({
        title: 'Missing details',
        description: 'Email and an 8+ character password are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { requiresEmailVerification } = await signUpWithEmail({
        email: signupForm.email,
        password: signupForm.password,
        fullName: signupForm.fullName,
        phone: signupForm.phone,
        idNumber: signupForm.idNumber,
        location: signupForm.location,
      });

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
      toast({ title: 'Unable to sign up', description: message, variant: 'destructive' });
    } finally {
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

            <Tabs value={mode} onValueChange={(val) => setMode(val as Mode)} className="space-y-6">
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
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground/80">
                      Password
                    </Label>
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

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary via-blue-600 to-cyan-600 text-white shadow-lg shadow-primary/20 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700"
                    disabled={isSubmitting}
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

                  <Button
                    type="submit"
                    className="w-full md:col-span-2 bg-gradient-to-r from-primary via-blue-600 to-cyan-600 text-white shadow-lg shadow-primary/20 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700"
                    disabled={isSubmitting}
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
