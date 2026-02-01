/**
 * Hook for managing email and SMS notification preferences
 * Note: This hook requires a notification_preferences table that may not exist yet.
 * Until that table is created, this provides stub functionality.
 */

import { useState, useEffect } from 'react';
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
      // notification_preferences table doesn't exist yet
      // Provide default preferences
      const defaultPrefs: NotificationPreference = {
        id: 'default',
        user_id: userId,
        email_announcements: true,
        email_approvals: true,
        email_contributions: false,
        email_welfare: true,
        sms_reminders: false,
        sms_announcements: false,
        reminder_frequency: 'weekly',
        updated_at: new Date().toISOString(),
      };
      setPreferences(defaultPrefs);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const updatePreferences = async (updates: Partial<NotificationPreference>) => {
    if (!preferences?.id) return;

    // Stub: notification_preferences table doesn't exist yet
    setPreferences((prev) =>
      prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null
    );

    toast({
      title: 'Success',
      description: 'Notification preferences updated',
    });
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
