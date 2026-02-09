import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
}

export const AuthScreen = ({ defaultMode = 'signin' }: AuthScreenProps) => {
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
    if (status === 'ready') {
      navigate('/dashboard', { replace: true });
    } else if (status === 'needs-profile') {
      navigate('/profile-setup', { replace: true });
    }
  }, [navigate, status]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmail(loginForm);
      toast({ title: 'Welcome back', description: 'You are now signed in.' });
      navigate('/dashboard', { replace: true });
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-3xl shadow-2xl border-border/60 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-semibold flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Account Access
          </CardTitle>
          <CardDescription>
            Securely sign in or create your Turuturu Stars account. Email delivery is powered by your
            Supabase + Brevo setup.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={mode} onValueChange={(val) => setMode(val as Mode)} className="space-y-6">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-9"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="pl-9"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
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
                <Alert className="mb-4">
                  <AlertDescription>
                    We created your account. Check your email for the confirmation link. After
                    confirming, sign back in and complete your profile.
                  </AlertDescription>
                </Alert>
              )}

              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSignup}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      className="pl-9"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={8}
                      className="pl-9"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-fullname"
                      required
                      className="pl-9"
                      value={signupForm.fullName}
                      onChange={(e) => setSignupForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      placeholder="+2547..."
                      className="pl-9"
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-id">National ID</Label>
                  <Input
                    id="signup-id"
                    value={signupForm.idNumber}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="signup-location">Location</Label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-location"
                      className="pl-9"
                      value={signupForm.location}
                      onChange={(e) => setSignupForm((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full md:col-span-2" disabled={isSubmitting}>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthScreen;
