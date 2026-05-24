import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProfilePhotoUpload from '@/components/dashboard/ProfilePhotoUpload';
import { MEMBER_LOCATIONS } from '@/constants/memberLocations';
import { updateProfile, type ProfileRow } from '@/features/auth/authApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { passwordChangeSchema, validatePasswordStrength } from '@/lib/validation';
import { clearDefaultPasswordChangeRequired, isDefaultPasswordChangeRequired } from '@/utils/defaultPasswordChange';
import { formatKenyanPhoneError, normalizeKenyanPhone } from '@/utils/kenyanPhone';

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const EMPTY_PROFILE_FORM = {
  fullName: '',
  phone: '',
  idNumber: '',
  location: '',
  otherLocation: '',
  occupation: '',
  isStudent: false,
};

const LOCATION_UNSET = 'location-unset';
const KNOWN_LOCATIONS = MEMBER_LOCATIONS.filter((location) => location !== 'Other') as readonly string[];

type PasswordField = keyof typeof EMPTY_PASSWORD_FORM;
type ProfileField = keyof typeof EMPTY_PROFILE_FORM;

const getProfileForm = (profile?: ProfileRow | null) => {
  if (!profile) return EMPTY_PROFILE_FORM;

  const hasCustomLocation = Boolean(profile.location && !KNOWN_LOCATIONS.includes(profile.location));

  return {
    fullName: profile.full_name || '',
    phone: profile.phone || '',
    idNumber: profile.id_number || '',
    location: hasCustomLocation ? 'Other' : profile.location || '',
    otherLocation: hasCustomLocation ? profile.location || '' : '',
    occupation: profile.occupation || '',
    isStudent: Boolean(profile.is_student),
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusMeta = (status?: string | null) => {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        icon: BadgeCheck,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'suspended':
      return {
        label: 'Suspended',
        icon: ShieldAlert,
        className: 'border-red-200 bg-red-50 text-red-700',
      };
    case 'dormant':
      return {
        label: 'Dormant',
        icon: AlertCircle,
        className: 'border-slate-200 bg-slate-50 text-slate-700',
      };
    default:
      return {
        label: 'Pending',
        icon: AlertCircle,
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
  }
};

const ProfilePage = () => {
  usePageMeta({
    title: 'My Profile | Turuturu Stars',
    description: 'View and update your Turuturu Stars member profile.',
    robots: 'noindex,nofollow',
  });

  const { user, profile, roles = [], refreshProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [defaultPasswordChangeRequired, setDefaultPasswordChangeRequired] = useState(false);
  const [form, setForm] = useState(EMPTY_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const savedProfileForm = useMemo(() => getProfileForm(profile), [profile]);

  useEffect(() => {
    setForm(savedProfileForm);
  }, [savedProfileForm]);

  useEffect(() => {
    if (!user?.id) {
      setDefaultPasswordChangeRequired(false);
      return;
    }

    setDefaultPasswordChangeRequired(
      searchParams.get('changePassword') === '1' || isDefaultPasswordChangeRequired(user.id)
    );
  }, [searchParams, user?.id]);

  const statusMeta = useMemo(() => getStatusMeta(profile?.status), [profile?.status]);
  const StatusIcon = statusMeta.icon;
  const officialRoles = roles.filter((role) => role !== 'member');

  const profileErrors = useMemo<Partial<Record<ProfileField, string>>>(() => {
    const nextErrors: Partial<Record<ProfileField, string>> = {};

    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!normalizeKenyanPhone(form.phone)) {
      nextErrors.phone = formatKenyanPhoneError();
    }
    if (!form.idNumber.trim()) nextErrors.idNumber = 'National ID is required.';
    if (form.location === 'Other' && !form.otherLocation.trim()) {
      nextErrors.otherLocation = 'Enter your location.';
    }

    return nextErrors;
  }, [form]);

  const isProfileDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedProfileForm),
    [form, savedProfileForm]
  );

  const canSave = Boolean(user?.id) && isProfileDirty && Object.keys(profileErrors).length === 0;

  const passwordStrength = useMemo(
    () => validatePasswordStrength(passwordForm.newPassword),
    [passwordForm.newPassword]
  );

  const passwordRequirements = useMemo(
    () => [
      { label: '8+ characters', met: passwordForm.newPassword.length >= 8 },
      { label: 'Uppercase', met: /[A-Z]/.test(passwordForm.newPassword) },
      { label: 'Lowercase', met: /[a-z]/.test(passwordForm.newPassword) },
      { label: 'Number', met: /[0-9]/.test(passwordForm.newPassword) },
      { label: 'Special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword) },
    ],
    [passwordForm.newPassword]
  );

  const completionItems = useMemo(
    () => [
      { label: 'Photo', complete: Boolean(profile?.photo_url) },
      { label: 'Name', complete: Boolean(profile?.full_name?.trim()) },
      { label: 'Phone', complete: Boolean(profile?.phone) },
      { label: 'National ID', complete: Boolean(profile?.id_number) },
      { label: 'Location', complete: Boolean(profile?.location) },
      { label: 'Occupation', complete: Boolean(profile?.occupation) },
    ],
    [profile]
  );

  const completionPercent = Math.round(
    (completionItems.filter((item) => item.complete).length / completionItems.length) * 100
  );

  const detailTiles = [
    {
      label: 'Email',
      value: profile?.email || user?.email || 'Not set',
      icon: Mail,
      className: 'bg-sky-50 text-sky-700 border-sky-100',
    },
    {
      label: 'Phone',
      value: profile?.phone || 'Missing',
      icon: Phone,
      className: profile?.phone
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : 'bg-amber-50 text-amber-700 border-amber-100',
    },
    {
      label: 'Location',
      value: profile?.location || 'Not set',
      icon: MapPin,
      className: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    },
    {
      label: 'Joined',
      value: formatDate(profile?.joined_at),
      icon: CalendarDays,
      className: 'bg-violet-50 text-violet-700 border-violet-100',
    },
  ];

  const setField = (field: ProfileField, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setPasswordField = (field: PasswordField, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      delete next.form;
      return next;
    });
  };

  const togglePasswordVisibility = (field: PasswordField) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const resetProfileForm = () => {
    setForm(savedProfileForm);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) return;

    if (Object.keys(profileErrors).length > 0) {
      toast({
        title: 'Check profile details',
        description: Object.values(profileErrors)[0],
        variant: 'destructive',
      });
      return;
    }

    const normalizedPhone = normalizeKenyanPhone(form.phone);
    if (!normalizedPhone) return;

    const finalLocation = form.location === 'Other' ? form.otherLocation.trim() : form.location.trim();

    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: form.fullName.trim(),
        phone: normalizedPhone,
        id_number: form.idNumber.replace(/\s+/g, '').trim(),
        location: finalLocation || null,
        occupation: form.occupation.trim() || null,
        is_student: form.isStudent,
      });
      await refreshProfile();
      toast({ title: 'Profile saved', description: 'Your member details are up to date.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save profile.';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordErrors({});

    const parsed = passwordChangeSchema.safeParse(passwordForm);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.errors.forEach((error) => {
        const field = String(error.path[0] || 'form');
        if (!nextErrors[field]) nextErrors[field] = error.message;
      });
      setPasswordErrors(nextErrors);
      toast({
        title: 'Check password fields',
        description: 'Fix the highlighted fields and try again.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordErrors({ newPassword: 'Choose a password different from your current password.' });
      return;
    }

    const accountEmail = user?.email || profile?.email;
    if (!accountEmail) {
      toast({
        title: 'Password update unavailable',
        description: 'This account does not have an email address for password verification.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        const message =
          signInError.message === 'Invalid login credentials'
            ? 'Current password is incorrect.'
            : signInError.message;

        setPasswordErrors({ currentPassword: message });
        toast({ title: 'Password update failed', description: message, variant: 'destructive' });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) throw updateError;

      if (user?.id) {
        clearDefaultPasswordChangeRequired(user.id);
      }

      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordErrors({});
      setDefaultPasswordChangeRequired(false);
      toast({ title: 'Password updated', description: 'Your account password has been changed.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update password.';
      setPasswordErrors({ form: message });
      toast({ title: 'Password update failed', description: message, variant: 'destructive' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="md:w-48 md:flex-none">
                <ProfilePhotoUpload
                  currentPhotoId={profile.photo_url}
                  fullName={profile.full_name || 'Member'}
                  userId={user.id}
                  onPhotoUpdate={() => void refreshProfile()}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn('gap-1.5 border', statusMeta.className)}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusMeta.label}
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {profile.membership_number || 'Membership pending'}
                    </Badge>
                    {profile.is_student && (
                      <Badge variant="secondary" className="gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Student
                      </Badge>
                    )}
                    {officialRoles.map((role) => (
                      <Badge key={role} variant="outline" className="capitalize">
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>

                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
                      {profile.full_name || 'Member profile'}
                    </h1>
                    <p className="truncate text-sm text-muted-foreground">
                      {profile.email || user.email || 'Email not set'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {detailTiles.map((tile) => {
                    const Icon = tile.icon;

                    return (
                      <div
                        key={tile.label}
                        className={cn('min-w-0 rounded-lg border p-3', tile.className)}
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium opacity-80">
                          <Icon className="h-3.5 w-3.5" />
                          {tile.label}
                        </div>
                        <p className="truncate text-sm font-semibold">{tile.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <aside className="border-t bg-secondary/35 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">Profile readiness</span>
                  <span className="text-sm font-medium text-muted-foreground">{completionPercent}%</span>
                </div>
                <Progress value={completionPercent} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {completionItems.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex min-h-10 items-center gap-2 rounded-md border px-2.5 text-xs font-medium',
                      item.complete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    )}
                  >
                    {item.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-background/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Member type</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {profile.is_student ? 'Student member' : 'Full member'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {profile.status !== 'active' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account status is {profile.status || 'pending'}. Some services may stay limited until approval.
          </AlertDescription>
        </Alert>
      )}

      {defaultPasswordChangeRequired && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Your current password is your National ID. Change it before continuing to use the dashboard.</span>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <a href="#security">Update now</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl tracking-normal">Member Details</CardTitle>
            <CardDescription>Required member records and contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="full-name" className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="full-name"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) => setField('fullName', event.target.value)}
                    aria-invalid={Boolean(profileErrors.fullName)}
                    required
                  />
                  {profileErrors.fullName && <p className="text-sm text-destructive">{profileErrors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input id="email" value={profile.email || user.email || ''} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    aria-invalid={Boolean(profileErrors.phone)}
                    required
                  />
                  {profileErrors.phone && <p className="text-sm text-destructive">{profileErrors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id-number" className="flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    National ID
                  </Label>
                  <Input
                    id="id-number"
                    inputMode="numeric"
                    value={form.idNumber}
                    onChange={(event) => setField('idNumber', event.target.value)}
                    aria-invalid={Boolean(profileErrors.idNumber)}
                    required
                  />
                  {profileErrors.idNumber && <p className="text-sm text-destructive">{profileErrors.idNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Select
                    value={form.location || LOCATION_UNSET}
                    onValueChange={(value) => setField('location', value === LOCATION_UNSET ? '' : value)}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LOCATION_UNSET}>Not specified</SelectItem>
                      {MEMBER_LOCATIONS.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.location === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor="other-location">Other Location</Label>
                    <Input
                      id="other-location"
                      value={form.otherLocation}
                      onChange={(event) => setField('otherLocation', event.target.value)}
                      aria-invalid={Boolean(profileErrors.otherLocation)}
                    />
                    {profileErrors.otherLocation && (
                      <p className="text-sm text-destructive">{profileErrors.otherLocation}</p>
                    )}
                  </div>
                )}

                <div className={cn('space-y-2', form.location !== 'Other' && 'md:col-span-2')}>
                  <Label htmlFor="occupation" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Occupation
                  </Label>
                  <Input
                    id="occupation"
                    autoComplete="organization-title"
                    value={form.occupation}
                    onChange={(event) => setField('occupation', event.target.value)}
                  />
                </div>
              </div>

              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border bg-secondary/30 px-3 text-sm">
                <Checkbox
                  checked={form.isStudent}
                  onCheckedChange={(checked) => setField('isStudent', checked === true)}
                />
                <span className="flex min-w-0 items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Student member
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetProfileForm}
                  disabled={!isProfileDirty || isSaving}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Changes
                </Button>
                <Button type="submit" disabled={!canSave || isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card id="security" className={cn(defaultPasswordChangeRequired && 'border-amber-300 shadow-amber-100')}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Account Security
              </CardTitle>
              <CardDescription>Change your password after confirming your current password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handlePasswordUpdate}>
                {passwordErrors.form && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordErrors.form}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {(['currentPassword', 'newPassword', 'confirmPassword'] as PasswordField[]).map((field) => {
                    const label =
                      field === 'currentPassword'
                        ? 'Current Password'
                        : field === 'newPassword'
                          ? 'New Password'
                          : 'Confirm Password';

                    return (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={field}>{label}</Label>
                        <div className="relative">
                          <Input
                            id={field}
                            type={showPassword[field] ? 'text' : 'password'}
                            autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
                            value={passwordForm[field]}
                            onChange={(event) => setPasswordField(field, event.target.value)}
                            disabled={isUpdatingPassword}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-10 w-10"
                            aria-label={showPassword[field] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                            onClick={() => togglePasswordVisibility(field)}
                          >
                            {showPassword[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {passwordErrors[field] && (
                          <p className="text-sm text-destructive">{passwordErrors[field]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-lg border bg-secondary/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">Password strength</span>
                    <span className="text-muted-foreground">
                      {passwordForm.newPassword ? `${passwordStrength.score}/6` : 'Not started'}
                    </span>
                  </div>
                  <Progress value={Math.round((passwordStrength.score / 6) * 100)} className="h-2" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {passwordRequirements.map((requirement) => (
                      <Badge
                        key={requirement.label}
                        variant={requirement.met ? 'secondary' : 'outline'}
                        className={cn(
                          'gap-1',
                          requirement.met
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-background text-muted-foreground'
                        )}
                      >
                        {requirement.met ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {requirement.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isUpdatingPassword} className="w-full">
                  {isUpdatingPassword ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl tracking-normal">Membership</CardTitle>
              <CardDescription>Your current standing and payment markers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Membership number', value: profile.membership_number || 'Pending' },
                { label: 'Membership type', value: profile.is_student ? 'Student member' : 'Full member' },
                { label: 'Joined', value: formatDate(profile.joined_at) },
                { label: 'Last updated', value: formatDate(profile.updated_at) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="min-w-0 truncate text-right text-sm font-semibold">{item.value}</span>
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Registration fee</span>
                {profile.registration_fee_paid ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Paid</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
