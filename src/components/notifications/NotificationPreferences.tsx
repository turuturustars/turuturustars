import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Loader2,
  Volume2,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferencesState {
  enableAnnouncements: boolean;
  enableContributions: boolean;
  enableWelfare: boolean;
  enableMeetings: boolean;
  enableApprovals: boolean;
  emailNotifications: boolean;
  soundNotifications: boolean;
  pushNotifications: boolean;
}

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [preferences, setPreferences] = useState<NotificationPreferencesState>({
    enableAnnouncements: true,
    enableContributions: true,
    enableWelfare: true,
    enableMeetings: true,
    enableApprovals: true,
    emailNotifications: true,
    soundNotifications: true,
    pushNotifications: true,
  });

  // Load preferences from localStorage
  useEffect(() => {
    if (user?.id) {
      const savedPrefs = localStorage.getItem(`notification_prefs_${user.id}`);
      if (savedPrefs) {
        try {
          setPreferences(JSON.parse(savedPrefs));
        } catch (e) {
          console.log('Could not parse saved preferences');
        }
      }
      setIsLoading(false);
    }
  }, [user?.id]);

  const handleToggle = (key: keyof NotificationPreferencesState) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      if (user?.id) {
        localStorage.setItem(`notification_prefs_${user.id}`, JSON.stringify(preferences));
      }
      toast({
        title: '✓ Preferences Updated',
        description: 'Your notification preferences have been saved',
      });
    } catch (error) {
      toast({
        title: '✗ Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-indigo-100">
          <Settings className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">Customize how you receive notifications</p>
        </div>
      </div>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which types of notifications you want to receive
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Announcements */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Announcements</h4>
              <p className="text-sm text-muted-foreground">Receive updates about organization announcements</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.enableAnnouncements}
                onChange={() => handleToggle('enableAnnouncements')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>

          {/* Contributions */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Contributions</h4>
              <p className="text-sm text-muted-foreground">Updates about your contribution status and payments</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.enableContributions}
                onChange={() => handleToggle('enableContributions')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>

          {/* Welfare */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Welfare Cases</h4>
              <p className="text-sm text-muted-foreground">Notifications about member welfare and support cases</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.enableWelfare}
                onChange={() => handleToggle('enableWelfare')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>

          {/* Meetings */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Meetings</h4>
              <p className="text-sm text-muted-foreground">Reminders and updates about scheduled meetings</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.enableMeetings}
                onChange={() => handleToggle('enableMeetings')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>

          {/* Approvals */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Approvals</h4>
              <p className="text-sm text-muted-foreground">Notifications about approvals and decisions</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.enableApprovals}
                onChange={() => handleToggle('enableApprovals')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Delivery Methods
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how you want to be notified
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* In-App Notifications */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                In-App Notifications
              </h4>
              <p className="text-sm text-muted-foreground">See notifications in the app</p>
            </div>
            <Badge variant="default">Always On</Badge>
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Sound Notifications
              </h4>
              <p className="text-sm text-muted-foreground">Play a sound when you receive notifications</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.soundNotifications}
                onChange={() => handleToggle('soundNotifications')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Notifications
              </h4>
              <p className="text-sm text-muted-foreground">Receive email summaries of your notifications</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Push Notifications
              </h4>
              <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.pushNotifications}
                onChange={() => handleToggle('pushNotifications')}
                className="w-4 h-4 rounded border-border"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            You will always receive critical notifications about your account and organizational matters, regardless of these settings.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NotificationPreferences;