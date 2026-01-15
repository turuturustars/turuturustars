import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  userId: string;
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
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Return defaults if not found
      return (
        data || {
          userId: user.id,
          enableAnnouncements: true,
          enableContributions: true,
          enableWelfare: true,
          enableMeetings: true,
          enableApprovals: true,
          emailNotifications: true,
          soundNotifications: true,
          pushNotifications: true,
        }
      );
    },
    enabled: !!user?.id,
  });

  const [localPreferences, setLocalPreferences] = useState(preferences);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...localPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
      toast({
        title: '✓ Preferences Updated',
        description: 'Your notification preferences have been saved',
      });
    },
    onError: (error: any) => {
      toast({
        title: '✗ Error',
        description: error.message || 'Failed to save preferences',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (key: keyof typeof localPreferences) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
          <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500">Customize how you receive notifications</p>
        </div>
      </div>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Choose which types of notifications you want to receive
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Announcements */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Announcements</h4>
              <p className="text-sm text-gray-500">Receive updates about organization announcements</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.enableAnnouncements || false}
                onChange={() => handleToggle('enableAnnouncements')}
                className="w-4 h-4 rounded border-gray-300"
              />
            </label>
          </div>

          {/* Contributions */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Contributions</h4>
              <p className="text-sm text-gray-500">Updates about your contribution status and payments</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.enableContributions || false}
                onChange={() => handleToggle('enableContributions')}
                className="w-4 h-4 rounded border-gray-300"
              />
            </label>
          </div>

          {/* Welfare */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Welfare Cases</h4>
              <p className="text-sm text-gray-500">Notifications about member welfare and support cases</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.enableWelfare || false}
                onChange={() => handleToggle('enableWelfare')}
                className="w-4 h-4 rounded border-gray-300"
              />
            </label>
          </div>

          {/* Meetings */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Meetings</h4>
              <p className="text-sm text-gray-500">Reminders and updates about scheduled meetings</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.enableMeetings || false}
                onChange={() => handleToggle('enableMeetings')}
                className="w-4 h-4 rounded border-gray-300"
              />
            </label>
          </div>

          {/* Approvals */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Approvals</h4>
              <p className="text-sm text-gray-500">Notifications about approvals and decisions</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.enableApprovals || false}
                onChange={() => handleToggle('enableApprovals')}
                className="w-4 h-4 rounded border-gray-300"
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
          <p className="text-sm text-gray-500 mt-1">
            Choose how you want to be notified
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* In-App Notifications */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                In-App Notifications
              </h4>
              <p className="text-sm text-gray-500">See notifications in the app</p>
            </div>
            <Badge variant="default">Always On</Badge>
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Sound Notifications
              </h4>
              <p className="text-sm text-gray-500">Play a sound when you receive notifications</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.soundNotifications || false}
                onChange={() => handleToggle('soundNotifications')}
                className="w-4 h-4 rounded border-gray-300"
              />
            </label>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Notifications
              </h4>
              <p className="text-sm text-gray-500">Receive email summaries of your notifications</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.emailNotifications || false}
                onChange={() => handleToggle('emailNotifications')}
                className="w-4 h-4 rounded border-gray-300"
              />
            </label>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Push Notifications
              </h4>
              <p className="text-sm text-gray-500">Receive push notifications on your device</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPreferences?.pushNotifications || false}
                onChange={() => handleToggle('pushNotifications')}
                className="w-4 h-4 rounded border-gray-300"
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
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
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
