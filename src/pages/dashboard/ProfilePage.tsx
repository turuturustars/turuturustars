import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Briefcase, Calendar, Save, Loader2, MapPin, ShieldCheck, IdCard } from 'lucide-react';
import ProfilePhotoUpload from '@/components/dashboard/ProfilePhotoUpload';

// Location options
const LOCATIONS = [
  'Turuturu',
  'Gatune',
  'Mutoho',
  'Githeru',
  'Kahariro',
  'Kiangige',
  'Daboo',
  'Githima',
  'Nguku',
  'Ngaru',
  'Kiugu',
  'Kairi',
  'Other'
] as const;

const ProfilePage = () => {
  const { profile, roles } = useAuth();
  const { toast } = useToast();
  const { status, showSuccess } = useStatus();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    id_number: '',
    location: '',
    otherLocation: '',
    occupation: '',
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const isOtherLocation = profile.location && !LOCATIONS.slice(0, -1).includes(profile.location as any);
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        id_number: profile.id_number || '',
        location: isOtherLocation ? 'Other' : (profile.location || ''),
        otherLocation: isOtherLocation ? (profile.location || '') : '',
        occupation: profile.occupation || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile?.id) return;

    setIsSaving(true);

    try {
      const finalLocation = formData.location === 'Other' ? formData.otherLocation : formData.location;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          id_number: formData.id_number,
          location: finalLocation || null,
          occupation: formData.occupation || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'dormant':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-purple-50/40 to-transparent p-6 shadow-sm">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-purple-200/30 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
            <p className="text-sm text-muted-foreground">Manage your personal information</p>
          </div>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="border-2 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <ProfilePhotoUpload
              currentPhotoId={profile?.photo_url || null}
              fullName={profile?.full_name || 'Member'}
              userId={profile?.id || ''}
              onPhotoUpdate={(photoUrl) => {
                console.log('Photo updated:', photoUrl);
              }}
            />
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{profile?.full_name}</h3>
                  <p className="text-muted-foreground font-mono">{profile?.membership_number || 'Pending ID'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Badge className={getStatusColor(profile?.status)}>
                    {profile?.status || 'Pending'}
                  </Badge>
                  {roles.filter((r) => r.role !== 'member').map((r) => (
                    <Badge key={r.role} variant="outline" className="capitalize">
                      {r.role.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : 'N/A'}
                </span>
                {profile?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                {profile?.is_student && (
                  <Badge variant="secondary">Student Member</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your contact and identification details</CardDescription>
          </div>
          {!isEditing && (
            <AccessibleButton 
              variant="outline" 
              ariaLabel="Edit profile information"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </AccessibleButton>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              ) : (
                <p className="text-foreground py-2">{profile?.full_name || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <p className="text-foreground py-2">{profile?.email || '-'}</p>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              ) : (
                <p className="text-foreground py-2">{profile?.phone || '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_number" className="flex items-center gap-2">
                ID Number
              </Label>
              {isEditing ? (
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                />
              ) : (
                <p className="text-foreground py-2">{profile?.id_number || 'Not provided'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              {isEditing ? (
                <div className="space-y-2">
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your location" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.location === 'Other' && (
                    <Input
                      placeholder="Specify your location"
                      value={formData.otherLocation}
                      onChange={(e) => setFormData({ ...formData, otherLocation: e.target.value })}
                    />
                  )}
                </div>
              ) : (
                <p className="text-foreground py-2">{profile?.location || 'Not specified'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Occupation
              </Label>
              {isEditing ? (
                <Input
                  id="occupation"
                  placeholder="e.g., Teacher, Farmer, Business Owner"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                />
              ) : (
                <p className="text-foreground py-2">{profile?.occupation || 'Not specified'}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <AccessibleButton 
                onClick={() => {
                  handleSave();
                  showSuccess('Profile saved successfully', 2000);
                }} 
                disabled={isSaving} 
                className="btn-primary"
                ariaLabel="Save profile changes"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </AccessibleButton>
              <AccessibleButton 
                variant="outline" 
                onClick={() => setIsEditing(false)} 
                disabled={isSaving}
                ariaLabel="Cancel profile editing"
              >
                Cancel
              </AccessibleButton>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Membership Status */}
      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle>Membership Status</CardTitle>
          <CardDescription>Your current membership standing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-accent/40 border border-border/60">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4" />
                Registration Fee
              </div>
              <div className="flex items-center gap-2 mt-2">
                {profile?.registration_fee_paid ? (
                  <Badge className="bg-green-100 text-green-800">Paid</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">Pending</Badge>
                )}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-accent/40 border border-border/60">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IdCard className="w-4 h-4" />
                Membership Type
              </div>
              <p className="font-medium mt-2">
                {profile?.is_student ? 'Student Member' : 'Full Member'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-accent/40 border border-border/60">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Joined
              </div>
              <p className="font-medium mt-2">
                {profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
