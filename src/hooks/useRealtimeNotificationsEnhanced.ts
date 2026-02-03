import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// Import notification sound
import notificationSound from '@/assets/audios/notification-sound-effect-372475.mp3';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'announcement' | 'contribution' | 'welfare' | 'approval' | 'meeting' | 'system';
  read: boolean;
  action_url?: string;
  sent_via?: string[];
  created_at: string;
  updated_at: string;
}

interface RawNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  action_url?: string;
  sent_via?: string[] | null;
  created_at: string;
  updated_at?: string;
}

// Play notification sound
const playNotificationSound = () => {
  try {
    const audio = new Audio(notificationSound);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Ignore errors
  }
};

export const useRealtimeNotificationsEnhanced = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Handler for INSERT events
  const handleInsertNotification = useCallback((payload: { new: Record<string, unknown> }) => {
    const { new: data } = payload;
    const newNotification: Notification = {
      id: data.id as string,
      user_id: data.user_id as string,
      title: data.title as string,
      message: data.message as string,
      type: (data.type as Notification['type']) || 'system',
      read: (data.read as boolean) || false,
      action_url: data.action_url as string | undefined,
      sent_via: (data.sent_via as string[]) || [],
      created_at: data.created_at as string,
      updated_at: (data.updated_at as string) || new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    toast({
      title: newNotification.title,
      description: newNotification.message,
    });

    // Play notification sound
    playNotificationSound();
  }, [toast]);

  // Handler for UPDATE events
  const handleUpdateNotification = useCallback((payload: { new: Record<string, unknown> }) => {
    const { new: data } = payload;
    const updatedNotification: Notification = {
      id: data.id as string,
      user_id: data.user_id as string,
      title: data.title as string,
      message: data.message as string,
      type: (data.type as Notification['type']) || 'system',
      read: (data.read as boolean) || false,
      action_url: data.action_url as string | undefined,
      sent_via: (data.sent_via as string[]) || [],
      created_at: data.created_at as string,
      updated_at: (data.updated_at as string) || new Date().toISOString(),
    };
    setNotifications(prev => {
      const wasUnread = prev.find(n => n.id === updatedNotification.id)?.read === false;
      const isNowUnread = !updatedNotification.read;

      const updated = prev.map(n => n.id === updatedNotification.id ? updatedNotification : n);

      if (wasUnread && !isNowUnread) {
        setUnreadCount(current => Math.max(0, current - 1));
      } else if (!wasUnread && isNowUnread) {
        setUnreadCount(current => current + 1);
      }

      return updated;
    });
  }, []);

  // Handler for DELETE events
  const handleDeleteNotification = useCallback((payload: { old: { id: string } }) => {
    const deletedNotificationId = payload.old.id;
    setNotifications(prev => {
      const wasUnread = prev.find(n => n.id === deletedNotificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(current => Math.max(0, current - 1));
      }
      return prev.filter(n => n.id !== deletedNotificationId);
    });
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, type, read, sent_via, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = ((data || []) as RawNotification[]).map((n) => {
        const notification: Notification = {
          id: n.id,
          user_id: n.user_id,
          title: n.title,
          message: n.message,
          type: (n.type || 'system') as Notification['type'],
          read: n.read || false,
          action_url: n.action_url,
          sent_via: n.sent_via || [],
          created_at: n.created_at,
          updated_at: n.updated_at || new Date().toISOString()
        };
        return notification;
      });
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        handleInsertNotification
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        handleUpdateNotification
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        handleDeleteNotification as (payload: { old: Record<string, unknown> }) => void
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications, handleInsertNotification, handleUpdateNotification, handleDeleteNotification]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount(current => Math.max(0, current - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    }
  }, []);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refresh: fetchNotifications,
  };
};
