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
  Sparkles,
  Calendar,
  DollarSign,
  Heart,
  FileCheck,
  Megaphone,
  Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

interface NotificationType {
  key: keyof Pick<NotificationPreferencesState, 'enableAnnouncements' | 'enableContributions' | 'enableWelfare' | 'enableMeetings' | 'enableApprovals'>;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
}

interface DeliveryMethod {
  key: keyof Pick<NotificationPreferencesState, 'emailNotifications' | 'soundNotifications' | 'pushNotifications'>;
  title: string;
  description: string;
  icon: any;
  canToggle: boolean;
}

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferencesState>({
    enableAnnouncements: true,
    enableContributions: true,
    enableWelfare: true,
    enableMeetings: true,
    enableApprovals: true,
    emailNotifications: true,
    soundNotifications: true,
    pushNotifications: true,
  });

  useEffect(() => {
    const loadPreferences = () => {
      if (user?.id) {
        try {
          const savedPrefs = localStorage.getItem(`notification_prefs_${user.id}`);
          if (savedPrefs) {
            const parsed = JSON.parse(savedPrefs);
            setPreferences(parsed);
            setOriginalPreferences(parsed);
          }
        } catch (e) {
          console.error('Could not parse saved preferences:', e);
          toast({
            title: 'Error',
            description: 'Failed to load saved preferences',
            variant: 'destructive',
          });
        }
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, [user?.id, toast]);

  useEffect(() => {
    const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
    setHasChanges(changed);
  }, [preferences, originalPreferences]);

  const handleToggle = (key: keyof NotificationPreferencesState) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (user?.id) {
        localStorage.setItem(`notification_prefs_${user.id}`, JSON.stringify(preferences));
        setOriginalPreferences(preferences);
        setHasChanges(false);
        toast({
          title: 'Success',
          description: 'Your notification preferences have been saved',
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences(originalPreferences);
    setHasChanges(false);
  };

  const notificationTypes: NotificationType[] = [
    {
      key: 'enableAnnouncements',
      title: 'Announcements',
      description: 'Receive updates about organization announcements and news',
      icon: Megaphone,
      color: 'text-purple-700 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
      key: 'enableContributions',
      title: 'Contributions',
      description: 'Updates about your contribution status, payments, and reminders',
      icon: DollarSign,
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-50 dark:bg-green-950/50',
    },
    {
      key: 'enableWelfare',
      title: 'Welfare Cases',
      description: 'Notifications about member welfare and support cases',
      icon: Heart,
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-950/50',
    },
    {
      key: 'enableMeetings',
      title: 'Meetings',
      description: 'Reminders and updates about scheduled meetings and events',
      icon: Calendar,
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      key: 'enableApprovals',
      title: 'Approvals',
      description: 'Notifications about approvals, decisions, and action items',
      icon: FileCheck,
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
    },
  ];

  const deliveryMethods: DeliveryMethod[] = [
    {
      key: 'soundNotifications',
      title: 'Sound Notifications',
      description: 'Play a sound when you receive new notifications',
      icon: Volume2,
      canToggle: true,
    },
    {
      key: 'emailNotifications',
      title: 'Email Notifications',
      description: 'Receive email summaries of your notifications',
      icon: Mail,
      canToggle: true,
    },
    {
      key: 'pushNotifications',
      title: 'Push Notifications',
      description: 'Receive push notifications on your device',
      icon: Smartphone,
      canToggle: true,
    },
  ];

  const enabledCount = Object.entries(preferences)
    .filter(([key]) => key.startsWith('enable'))
    .filter(([, value]) => value).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 pb-8">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-purple-50/50 to-primary/5 dark:from-primary/20 dark:via-purple-950/50 dark:to-primary/10 p-6 sm:p-8 border-2 border-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border-2 border-primary/20 shadow-lg">
            <Settings className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Notification Preferences
            </h1>
            <p className="text-sm text-muted-foreground">
              Customize how and when you receive notifications
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5"
          >
            {enabledCount} of 5 enabled
          </Badge>
        </div>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notification Types</CardTitle>
            </div>
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Choose which types of notifications you want to receive
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationTypes.map((type) => {
            const Icon = type.icon;
            const isEnabled = preferences[type.key];
            
            return (
              <div
                key={type.key}
                className={cn(
                  'group relative flex items-center justify-between p-4 border-2 rounded-xl transition-all duration-300 cursor-pointer',
                  isEnabled
                    ? 'border-primary/30 bg-primary/5 shadow-sm hover:shadow-md'
                    : 'border-border bg-background hover:bg-accent/50'
                )}
                onClick={() => handleToggle(type.key)}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    'p-3 rounded-lg border-2 transition-all duration-300',
                    isEnabled ? type.bgColor : 'bg-muted',
                    isEnabled ? 'border-transparent' : 'border-border',
                    'group-hover:scale-110'
                  )}>
                    <Icon className={cn('w-5 h-5', isEnabled ? type.color : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1">{type.title}</h4>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(type.key)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors">
                    <div className={cn(
                      "absolute top-0.5 left-0.5 bg-background rounded-full h-5 w-5 transition-transform shadow-sm",
                      isEnabled && "translate-x-5"
                    )} />
                  </div>
                </label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle>Delivery Methods</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Choose how you want to be notified
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 border-2 border-primary/30 bg-primary/5 rounded-xl">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 rounded-lg bg-primary/10 border-2 border-transparent">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  In-App Notifications
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-sm text-muted-foreground">
                  See notifications in the app interface
                </p>
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground shadow-sm">
              Always On
            </Badge>
          </div>

          {deliveryMethods.map((method) => {
            const Icon = method.icon;
            const isEnabled = preferences[method.key];
            
            return (
              <div
                key={method.key}
                className={cn(
                  'group relative flex items-center justify-between p-4 border-2 rounded-xl transition-all duration-300 cursor-pointer',
                  isEnabled
                    ? 'border-primary/30 bg-primary/5 shadow-sm hover:shadow-md'
                    : 'border-border bg-background hover:bg-accent/50'
                )}
                onClick={() => handleToggle(method.key)}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    'p-3 rounded-lg border-2 transition-all duration-300',
                    isEnabled ? 'bg-primary/10 border-transparent' : 'bg-muted border-border',
                    'group-hover:scale-110'
                  )}>
                    <Icon className={cn('w-5 h-5', isEnabled ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1">{method.title}</h4>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(method.key)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors">
                    <div className={cn(
                      "absolute top-0.5 left-0.5 bg-background rounded-full h-5 w-5 transition-transform shadow-sm",
                      isEnabled && "translate-x-5"
                    )} />
                  </div>
                </label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900/50 shadow-sm">
        <CardContent className="flex items-start gap-3 pt-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Important Notice
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              You will always receive critical notifications about your account, security updates, and essential organizational matters, regardless of these settings.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 bg-background/95 backdrop-blur-sm border-2 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1 gap-2 h-11 text-base font-semibold shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Save Preferences
              </>
            )}
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isSaving}
              className="sm:w-auto gap-2 h-11 border-2"
            >
              Cancel
            </Button>
          )}
        </div>
        
        {hasChanges && (
          <p className="text-xs text-muted-foreground text-center mt-2 animate-in fade-in slide-in-from-bottom-2">
            You have unsaved changes
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferences;