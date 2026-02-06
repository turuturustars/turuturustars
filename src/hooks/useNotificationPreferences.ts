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

  const loadPreferences = useCallback(async () => {
    if (!userId) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await (supabase
      .from('notification_preferences' as never) as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading notification preferences:', error);
      setPreferences({
        user_id: userId,
        ...DEFAULT_PREFERENCES,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsLoading(false);
      return;
    }

    if (!data) {
      const insertPayload = {
        user_id: userId,
        ...DEFAULT_PREFERENCES,
      };
      const { data: created, error: insertError } = await (supabase
        .from('notification_preferences' as never) as any)
        .upsert(insertPayload, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating notification preferences:', insertError);
        setPreferences({
          user_id: userId,
          ...DEFAULT_PREFERENCES,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        setPreferences(created as NotificationPreferencesRecord);
      }
    } else {
      setPreferences(data as NotificationPreferencesRecord);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = useCallback(
    async (updates: Partial<NotificationPreferencesRecord>) => {
      if (!userId) return;

      setIsSaving(true);
      const payload = {
        user_id: userId,
        ...DEFAULT_PREFERENCES,
        ...(preferences ?? {}),
        ...updates,
      };

      const { data, error } = await (supabase
        .from('notification_preferences' as never) as any)
        .upsert(payload)
        .select('*')
        .single();

      if (error) {
        console.error('Error saving notification preferences:', error);
        toast({
          title: 'Error',
          description: 'Failed to save notification preferences',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      setPreferences(data as NotificationPreferencesRecord);
      setIsSaving(false);
      toast({
        title: 'Preferences updated',
        description: 'Your notification settings have been saved',
      });
    },
    [preferences, toast, userId]
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
