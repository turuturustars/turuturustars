import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type NotificationPreferenceType =
  | 'announcement'
  | 'contribution'
  | 'welfare'
  | 'meeting'
  | 'approval'
  | 'message'
  | 'transaction'
  | 'system'
  | 'private_message';

export interface NotificationPreferencesRecord {
  user_id: string;
  in_app: boolean;
  email: boolean;
  push: boolean;
  sound: boolean;
  enable_announcements: boolean;
  enable_contributions: boolean;
  enable_welfare: boolean;
  enable_meetings: boolean;
  enable_approvals: boolean;
  enable_messages: boolean;
  enable_transactions: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferencesRecord, 'user_id' | 'created_at' | 'updated_at'> = {
  in_app: true,
  email: true,
  push: true,
  sound: true,
  enable_announcements: true,
  enable_contributions: true,
  enable_welfare: true,
  enable_meetings: true,
  enable_approvals: true,
  enable_messages: true,
  enable_transactions: true,
};

export function useNotificationPreferences(userId?: string) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferencesRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Track whether table exists to avoid repeated failed requests
  const [tableAvailable, setTableAvailable] = useState(true);

  const fallbackPrefs = useCallback(
    (uid: string): NotificationPreferencesRecord => ({
      user_id: uid,
      ...DEFAULT_PREFERENCES,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    []
  );

  const loadPreferences = useCallback(async () => {
    if (!userId) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    if (!tableAvailable) {
      setPreferences(fallbackPrefs(userId));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from('notification_preferences' as never) as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // If it's a relation/table not found error, mark table as unavailable
        if (error.code === '42P01' || error.message?.includes('relation') || error.code === 'PGRST204') {
          setTableAvailable(false);
        }
        console.warn('Notification preferences not available:', error.message);
        setPreferences(fallbackPrefs(userId));
        setIsLoading(false);
        return;
      }

      if (!data) {
        // Try to create default preferences
        const { data: created, error: insertError } = await (supabase
          .from('notification_preferences' as never) as any)
          .upsert({ user_id: userId, ...DEFAULT_PREFERENCES }, { onConflict: 'user_id' })
          .select('*')
          .maybeSingle();

        if (insertError) {
          console.warn('Could not create notification preferences:', insertError.message);
          setPreferences(fallbackPrefs(userId));
        } else {
          setPreferences((created as NotificationPreferencesRecord) ?? fallbackPrefs(userId));
        }
      } else {
        setPreferences(data as NotificationPreferencesRecord);
      }
    } catch (e) {
      console.warn('Notification preferences load error:', e);
      setPreferences(fallbackPrefs(userId));
    }

    setIsLoading(false);
  }, [userId, tableAvailable, fallbackPrefs]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = useCallback(
    async (updates: Partial<NotificationPreferencesRecord>) => {
      if (!userId || !tableAvailable) return;

      setIsSaving(true);
      const payload = {
        user_id: userId,
        ...DEFAULT_PREFERENCES,
        ...(preferences ?? {}),
        ...updates,
      };

      try {
        const { data, error } = await (supabase
          .from('notification_preferences' as never) as any)
          .upsert(payload, { onConflict: 'user_id' })
          .select('*')
          .maybeSingle();

        if (error) {
          console.warn('Error saving notification preferences:', error.message);
          toast({
            title: 'Error',
            description: 'Failed to save notification preferences',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }

        setPreferences((data as NotificationPreferencesRecord) ?? { ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        toast({
          title: 'Preferences updated',
          description: 'Your notification settings have been saved',
        });
      } catch (e) {
        console.warn('Save preferences error:', e);
      }
      setIsSaving(false);
    },
    [preferences, toast, userId, tableAvailable]
  );

  const isTypeEnabled = useCallback(
    (type?: string | null) => {
      if (!preferences) return true;
      switch (type) {
        case 'announcement':
          return preferences.enable_announcements;
        case 'contribution':
          return preferences.enable_contributions;
        case 'welfare':
          return preferences.enable_welfare;
        case 'meeting':
          return preferences.enable_meetings;
        case 'approval':
          return preferences.enable_approvals;
        case 'message':
        case 'private_message':
          return preferences.enable_messages;
        case 'transaction':
          return preferences.enable_transactions;
        case 'system':
        default:
          return true;
      }
    },
    [preferences]
  );

  const delivery = useMemo(() => ({
    inApp: preferences?.in_app ?? true,
    email: preferences?.email ?? true,
    push: preferences?.push ?? true,
    sound: preferences?.sound ?? true,
  }), [preferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    savePreferences,
    reload: loadPreferences,
    isTypeEnabled,
    delivery,
  };
}
