import { supabase } from '@/integrations/supabase/client';
import { sendNotification } from './notificationService';
import { BrowserNotificationService } from './notificationService';

export type MeetingNotificationType = 'created' | 'scheduled' | 'cancelled' | 'reminder';

export interface MeetingNotificationPayload {
  meetingId: string;
  title: string;
  scheduledDate: string;
  type: MeetingNotificationType;
  venue?: string | null;
  agenda?: string | null;
  createdBy?: string;
}

/**
 * Send meeting notifications to stakeholders
 */
export const sendMeetingNotifications = async (
  payload: MeetingNotificationPayload,
  stakeholderIds: string[]
) => {
  try {
    const { title, scheduledDate, type, venue } = payload;
    
    // Format the notification message based on type
    let notificationTitle = '';
    let notificationMessage = '';
    
    const meetingDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    switch (type) {
      case 'created':
      case 'scheduled':
        notificationTitle = `📅 Meeting Scheduled: ${title}`;
        notificationMessage = `A new meeting "${title}" has been scheduled for ${meetingDate}${venue ? ` at ${venue}` : ''}`;
        break;
      case 'cancelled':
        notificationTitle = `❌ Meeting Cancelled: ${title}`;
        notificationMessage = `The meeting "${title}" scheduled for ${meetingDate} has been cancelled`;
        break;
      case 'reminder':
        notificationTitle = `⏰ Meeting Reminder: ${title}`;
        notificationMessage = `Reminder: "${title}" is happening ${meetingDate}`;
        break;
      default:
        notificationTitle = `Meeting Update: ${title}`;
        notificationMessage = `There's an update about the meeting "${title}"`;
    }

    // Send notifications to each stakeholder
    const notificationPromises = stakeholderIds.map(userId =>
      sendNotification({
        userId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'meeting',
        actionUrl: `/dashboard/governance/meetings`,
      }).catch(err => {
        console.error(`Failed to send notification to user ${userId}:`, err);
      })
    );

    await Promise.all(notificationPromises);

    // Show browser notification to current user if they're a stakeholder
    if (BrowserNotificationService.isEnabled()) {
      BrowserNotificationService.show(notificationTitle, {
        body: notificationMessage,
        tag: `meeting-${payload.meetingId}`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending meeting notifications:', error);
    throw error;
  }
};

/**
 * Play notification sound
 */
export const playNotificationSound = (volume: number = 0.5): void => {
  try {
    const audio = new Audio('/src/assets/audios/notification-sound-effect-372475.mp3');
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(err => {
      console.warn('Could not play notification sound:', err);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

/**
 * Get stakeholder IDs for a meeting (all active members + officials)
 */
export const getMeetingStakeholders = async (): Promise<string[]> => {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('status', 'active');

    return profiles?.map(p => p.id) || [];
  } catch (error) {
    console.error('Error fetching meeting stakeholders:', error);
    return [];
  }
};

/**
 * Get officials/management only (for executive meetings)
 */
export const getMeetingOfficials = async (): Promise<string[]> => {
  try {
    const { data: officials } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', [
        'admin',
        'chairperson',
        'vice_chairman',
        'secretary',
        'vice_secretary',
        'treasurer',
        'organizing_secretary',
      ]);

    return [...new Set(officials?.map(r => r.user_id) || [])];
  } catch (error) {
    console.error('Error fetching meeting officials:', error);
    return [];
  }
};

/**
 * Determine notification recipients based on meeting type
 */
export const getNotificationRecipients = async (meetingType: string): Promise<string[]> => {
  if (meetingType === 'management_committee' || meetingType === 'agm') {
    // Management committee and AGM notifications go to officials
    return getMeetingOfficials();
  } else {
    // General member meetings go to all active members
    return getMeetingStakeholders();
  }
};
