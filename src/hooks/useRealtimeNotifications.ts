import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNotificationPreferences } from './useNotificationPreferences';
import { useToast } from './use-toast';
import { BrowserNotificationService } from '@/lib/notificationService';
import notificationSound from '@/assets/audios/notification-sound-effect-372475.mp3';

interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  action_url?: string | null;
  created_at: string;
}

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { delivery, isTypeEnabled } = useNotificationPreferences(user?.id);
  const { toast } = useToast();
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const playNotificationSound = useCallback(() => {
    if (!(delivery.sound ?? true)) return;
    try {
      const audio = new Audio(notificationSound);
      audio.volume = 0.55;
      audio.play().catch(() => {
        // Browsers may block autoplay until the user interacts with the page.
      });
    } catch {
      // Ignore playback errors.
    }
  }, [delivery.sound]);

  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, type, read, action_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setAllNotifications(data as Notification[]);
      }
    };

    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setAllNotifications(prev => [newNotification, ...prev]);

          if (isTypeEnabled(newNotification.type)) {
            if (delivery.inApp ?? true) {
              toast({
                title: newNotification.title,
                description: newNotification.message,
              });
            }

            playNotificationSound();

            if ((delivery.push ?? false) && BrowserNotificationService.isEnabled()) {
              BrowserNotificationService.show(newNotification.title, {
                body: newNotification.message,
                tag: `notification-${newNotification.id}`,
                onClick: () => {
                  if (newNotification.action_url) {
                    window.location.href = newNotification.action_url;
                  }
                },
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setAllNotifications(prev => prev.map(n => n.id === updatedNotification.id ? updatedNotification : n));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [delivery.inApp, delivery.push, isTypeEnabled, playNotificationSound, toast, user?.id]);

  const notifications = useMemo(() => {
    if (!(delivery.inApp ?? true)) return [];
    return allNotifications.filter(notification => isTypeEnabled(notification.type));
  }, [allNotifications, delivery.inApp, isTypeEnabled]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setAllNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error) {
      setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
