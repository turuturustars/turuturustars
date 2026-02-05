import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { BrowserNotificationService } from '@/lib/notificationService';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import notificationSound from '@/assets/audios/notification-sound-effect-372475.mp3';

interface IncomingNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  action_url?: string | null;
  created_at?: string;
}

const playNotificationSound = () => {
  try {
    const audio = new Audio(notificationSound);
    audio.volume = 0.55;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Ignore playback errors
  }
};

const getToastClass = (type?: string) => {
  switch (type) {
    case 'announcement':
      return 'border-purple-200/80 bg-purple-50/90 text-purple-950';
    case 'contribution':
      return 'border-emerald-200/80 bg-emerald-50/90 text-emerald-950';
    case 'welfare':
      return 'border-blue-200/80 bg-blue-50/90 text-blue-950';
    case 'meeting':
      return 'border-amber-200/80 bg-amber-50/90 text-amber-950';
    case 'approval':
      return 'border-yellow-200/80 bg-yellow-50/90 text-yellow-950';
    case 'message':
    case 'private_message':
      return 'border-indigo-200/80 bg-indigo-50/90 text-indigo-950';
    case 'transaction':
      return 'border-green-200/80 bg-green-50/90 text-green-950';
    default:
      return 'border-border/60 bg-background text-foreground';
  }
};

const NotificationToastListener = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { delivery, isTypeEnabled } = useNotificationPreferences(user?.id);

  const allowInApp = delivery.inApp ?? true;
  const allowSound = delivery.sound ?? true;
  const allowPush = delivery.push ?? false;

  const isEnabledForType = useMemo(
    () => (notification: IncomingNotification) => isTypeEnabled(notification.type),
    [isTypeEnabled]
  );

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notification-toasts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as IncomingNotification;
          if (!isEnabledForType(notification)) return;

          if (allowInApp) {
            toast({
              title: notification.title,
              description: notification.message,
              className: getToastClass(notification.type),
              action: notification.action_url ? (
                <ToastAction
                  altText="Open"
                  onClick={() => {
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  Open
                </ToastAction>
              ) : undefined,
            });

            if (allowSound) {
              playNotificationSound();
            }
          }

          if (allowPush && BrowserNotificationService.isEnabled()) {
            BrowserNotificationService.show(notification.title, {
              body: notification.message,
              tag: `notification-${notification.id}`,
              onClick: () => {
                if (notification.action_url) {
                  window.location.href = notification.action_url;
                }
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [allowInApp, allowPush, allowSound, isEnabledForType, toast, user?.id]);

  return null;
};

export default NotificationToastListener;
