import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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
      updated_at: data.updated_at as string,
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
      updated_at: data.updated_at as string,
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
        .select('id, user_id, title, message, type, read, created_at, related_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []).map((n: RawNotification) => {
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

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }, [user?.id]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase.channel(`notifications:${user.id}`);
    
    channel
      .on<Record<string, unknown>>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleInsertNotification({ new: payload.new || {} });
        }
      )
      .on<Record<string, unknown>>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleUpdateNotification({ new: payload.new || {} });
        }
      )
      .on<Record<string, unknown>>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldId = payload.old.id as string;
          handleDeleteNotification({ old: { id: oldId } });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchNotifications, handleInsertNotification, handleUpdateNotification, handleDeleteNotification]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotifications,
  };
};

const playNotificationSound = () => {
  try {
    const AudioContextClass = (globalThis as typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext || globalThis.AudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};
