import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { resendVerificationEmail, updateProfile } from '@/features/auth/authApi';
import { usePageMeta } from '@/hooks/usePageMeta';

const ProfileSetup = () => {
  usePageMeta({
    title: 'Finish Your Profile',
    description: 'Complete your profile to access the member dashboard.',
    robots: 'noindex,nofollow',
  });

  const { user, profile, status, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    idNumber: '',
    location: '',
    occupation: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        idNumber: profile.id_number || '',
        location: profile.location || '',
        occupation: profile.occupation || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (status === 'ready') {
      const target = (location.state as any)?.from ?? '/dashboard';
      navigate(target, { replace: true });
    }
  }, [user, status, navigate, location.state]);

  const canSubmit = useMemo(
    () => form.fullName.trim() && form.phone.trim() && form.idNumber.trim(),
    [form]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!canSubmit) {
      toast({
        title: 'Missing information',
        description: 'Full name, phone, and ID number are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: form.fullName,
        phone: form.phone,
        id_number: form.idNumber,
        location: form.location || null,
        occupation: form.occupation || null,
        status: 'active',
      });

      await refreshProfile();
      toast({ title: 'Profile saved', description: 'You are all set!' });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save profile';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      await resendVerificationEmail(user.email);
      toast({ title: 'Email sent', description: 'Check your inbox for the confirmation link.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not resend email';
      toast({ title: 'Resend failed', description: message, variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl shadow-xl border-border/60">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            We need a few details to finish setting up your account and route you to the dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'needs-email-verification' && user?.email && (
            <Alert>
              <AlertDescription className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-primary" />
                <span>
                  Confirm your email address ({user.email}) to activate your account. Didn&apos;t get
                  it? Resend below, then refresh this page after clicking the link.
                </span>
              </AlertDescription>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleResend} disabled={resending}>
                {resending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Resend verification email
              </Button>
            </Alert>
          )}

          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSave}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idNumber">National ID *</Label>
              <Input
                id="idNumber"
                value={form.idNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={form.occupation}
                onChange={(e) => setForm((prev) => ({ ...prev, occupation: e.target.value }))}
              />
            </div>

            <Button type="submit" className="md:col-span-2" disabled={isSaving || !canSubmit}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save and continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
