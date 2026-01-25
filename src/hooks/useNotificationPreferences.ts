/**
 * Hook for managing email and SMS notification preferences
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreference {
  id: string;
  user_id: string;
  email_announcements: boolean;
  email_approvals: boolean;
  email_contributions: boolean;
  email_welfare: boolean;
  sms_reminders: boolean;
  sms_announcements: boolean;
  reminder_frequency: 'daily' | 'weekly' | 'monthly' | 'none';
  reminder_day_of_week?: number;
  updated_at: string;
}

export function useNotificationPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchPreferences(userId);
    }
  }, [userId]);

  const fetchPreferences = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences(data as NotificationPreference);
      } else {
        // Create default preferences if none exist
        const defaultPrefs = {
          user_id: id,
          email_announcements: true,
          email_approvals: true,
          email_contributions: false,
          email_welfare: true,
          sms_reminders: false,
          sms_announcements: false,
          reminder_frequency: 'weekly' as const,
          updated_at: new Date().toISOString(),
        };

        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs as NotificationPreference);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreference>) => {
    if (!preferences?.id) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', preferences.id);

      if (error) throw error;

      setPreferences((prev) =>
        prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null
      );

      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    }
  };

  const toggleEmailAnnouncements = () => {
    if (preferences) {
      updatePreferences({ email_announcements: !preferences.email_announcements });
    }
  };

  const toggleEmailApprovals = () => {
    if (preferences) {
      updatePreferences({ email_approvals: !preferences.email_approvals });
    }
  };

  const toggleEmailContributions = () => {
    if (preferences) {
      updatePreferences({ email_contributions: !preferences.email_contributions });
    }
  };

  const toggleEmailWelfare = () => {
    if (preferences) {
      updatePreferences({ email_welfare: !preferences.email_welfare });
    }
  };

  const toggleSMSReminders = () => {
    if (preferences) {
      updatePreferences({ sms_reminders: !preferences.sms_reminders });
    }
  };

  const toggleSMSAnnouncements = () => {
    if (preferences) {
      updatePreferences({ sms_announcements: !preferences.sms_announcements });
    }
  };

  const setReminderFrequency = (frequency: 'daily' | 'weekly' | 'monthly' | 'none') => {
    updatePreferences({ reminder_frequency: frequency });
  };

  return {
    preferences,
    isLoading,
    updatePreferences,
    toggleEmailAnnouncements,
    toggleEmailApprovals,
    toggleEmailContributions,
    toggleEmailWelfare,
    toggleSMSReminders,
    toggleSMSAnnouncements,
    setReminderFrequency,
  };
}
