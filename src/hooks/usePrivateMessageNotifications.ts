import { useEffect, useRef } from 'react';
import { BrowserNotificationService } from '@/lib/notificationService';
import type { PrivateMessage } from './usePrivateMessages';

interface UsePrivateMessageNotificationsOptions {
  enabled?: boolean;
  onNotificationClick?: (conversationId: string) => void;
}

/**
 * Hook to handle push notifications for new private messages
 */
export function usePrivateMessageNotifications(
  messages: PrivateMessage[],
  currentUserId: string | null | undefined,
  conversationId?: string,
  options?: UsePrivateMessageNotificationsOptions
) {
  const lastMessageIdRef = useRef<string | null>(null);
  const { enabled = true, onNotificationClick } = options || {};

  // Initialize notification permission on mount
  useEffect(() => {
    if (enabled && BrowserNotificationService.isSupported()) {
      // Check if we already have permission
      if (BrowserNotificationService.isEnabled()) {
        // Already have permission
      } else if (BrowserNotificationService.isEnabledInStorage()) {
        // User previously enabled, but may need to re-request
        BrowserNotificationService.requestPermission().catch(console.error);
      }
    }
  }, [enabled]);

  // Watch for new messages and send notifications
  useEffect(() => {
    if (!enabled || !messages || messages.length === 0 || !currentUserId) {
      return;
    }

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    
    // Only send notification if:
    // 1. This is a new message (not seen before)
    // 2. It's not from the current user
    // 3. Notifications are enabled
    if (
      latestMessage &&
      latestMessage.id !== lastMessageIdRef.current &&
      latestMessage.sender_id !== currentUserId &&
      BrowserNotificationService.isEnabled() &&
      BrowserNotificationService.isEnabledInStorage()
    ) {
      lastMessageIdRef.current = latestMessage.id;

      const senderName = latestMessage.sender_profile?.full_name || 'Someone';
      const messagePreview = latestMessage.content || 'New message';
      const senderPhotoUrl = latestMessage.sender_profile?.photo_url;

      // Show browser notification
      BrowserNotificationService.showPrivateMessageNotification(
        senderName,
        messagePreview,
        {
          senderPhotoUrl,
          conversationId,
          onClick: () => {
            if (onNotificationClick && conversationId) {
              onNotificationClick(conversationId);
            }
          },
        }
      );
    }
  }, [messages, currentUserId, conversationId, enabled, onNotificationClick]);

  /**
   * Manually request notification permission
   */
  const requestPermission = async (): Promise<boolean> => {
    return BrowserNotificationService.enable();
  };

  /**
   * Enable notifications
   */
  const enableNotifications = (): void => {
    BrowserNotificationService.enable().catch(console.error);
  };

  /**
   * Disable notifications
   */
  const disableNotifications = (): void => {
    BrowserNotificationService.disable();
  };

  /**
   * Check if notifications are currently enabled
   */
  const isNotificationsEnabled = (): boolean => {
    return BrowserNotificationService.isEnabled() && BrowserNotificationService.isEnabledInStorage();
  };

  /**
   * Check if browser supports notifications
   */
  const isNotificationsSupported = (): boolean => {
    return BrowserNotificationService.isSupported();
  };

  return {
    requestPermission,
    enableNotifications,
    disableNotifications,
    isNotificationsEnabled,
    isNotificationsSupported,
  };
}
