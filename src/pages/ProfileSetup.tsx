import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { resendVerificationEmail, updateProfile } from '@/features/auth/authApi';
import { usePageMeta } from '@/hooks/usePageMeta';
import { MEMBER_LOCATIONS } from '@/constants/memberLocations';

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
    otherLocation: '',
    occupation: '',
    isStudent: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (profile) {
      const isOtherLocation = profile.location && !MEMBER_LOCATIONS.slice(0, -1).includes(profile.location as any);
      setForm({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        idNumber: profile.id_number || '',
        location: isOtherLocation ? 'Other' : profile.location || '',
        otherLocation: isOtherLocation ? profile.location || '' : '',
        occupation: profile.occupation || '',
        isStudent: Boolean(profile.is_student),
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (status === 'ready' || status === 'pending-approval' || status === 'suspended') {
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
      const finalLocation = form.location === 'Other' ? form.otherLocation.trim() : form.location;
      await updateProfile(user.id, {
        full_name: form.fullName,
        phone: form.phone,
        id_number: form.idNumber,
        location: finalLocation || null,
        occupation: form.occupation || null,
        is_student: form.isStudent,
        status: profile?.status === 'active' ? 'active' : profile?.status === 'suspended' ? 'suspended' : 'pending',
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
                placeholder="+2547..."
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
              <Select
                value={form.location}
                onValueChange={(value) => setForm((prev) => ({ ...prev, location: value }))}
              >
                <SelectTrigger id="location" className="w-full">
                  <SelectValue placeholder="Select your location" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_LOCATIONS.map((locationOption) => (
                    <SelectItem key={locationOption} value={locationOption}>
                      {locationOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.location === 'Other' && (
                <Input
                  id="location-other"
                  placeholder="Specify your location"
                  value={form.otherLocation}
                  onChange={(e) => setForm((prev) => ({ ...prev, otherLocation: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={form.occupation}
                onChange={(e) => setForm((prev) => ({ ...prev, occupation: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="is-student" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Membership Type
              </Label>
              <label
                htmlFor="is-student"
                className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
              >
                <Checkbox
                  id="is-student"
                  checked={form.isStudent}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isStudent: checked === true }))
                  }
                />
                I am a student member
              </label>
            </div>

            <div className="md:col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              You can always edit these profile details later from your dashboard profile page.
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
