import { supabase } from '@/integrations/supabase/client';
import { BrowserNotificationService } from './notificationService';
import { enqueueBackgroundJob } from '@/lib/backgroundJobs';

export type MeetingNotificationType = 'created' | 'scheduled' | 'cancelled' | 'reminder';
export type MeetingRecipientScope = 'all_members' | 'officials';

export interface MeetingNotificationPayload {
  meetingId: string;
  title: string;
  scheduledDate: string;
  type: MeetingNotificationType;
  venue?: string | null;
  agenda?: string | null;
  createdBy?: string;
  recipientScope?: MeetingRecipientScope;
}

/**
 * Send meeting notifications to stakeholders
 */
export const sendMeetingNotifications = async (
  payload: MeetingNotificationPayload,
  _stakeholderIds: string[] = []
) => {
  try {
    const { meetingId, title, scheduledDate, type, venue, recipientScope } = payload;
    
    const jobId = await enqueueBackgroundJob({
      jobType: 'meeting_notifications',
      payload: {
        meetingId,
        title,
        scheduledDate,
        type,
        venue: venue || null,
        recipientScope: recipientScope || 'all_members',
      },
      priority: type === 'cancelled' ? 2 : 4,
      dedupeKey: `meeting_notifications:${meetingId}:${type}:${recipientScope || 'all_members'}`,
    });

    const meetingDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const notificationTitle = type === 'cancelled'
      ? `Meeting Cancelled: ${title}`
      : `Meeting Scheduled: ${title}`;
    const notificationMessage = type === 'cancelled'
      ? `The meeting "${title}" scheduled for ${meetingDate} has been cancelled`
      : `A new meeting "${title}" has been scheduled for ${meetingDate}${venue ? ` at ${venue}` : ''}`;

    // Show browser notification to current user if they're a stakeholder
    if (BrowserNotificationService.isEnabled()) {
      BrowserNotificationService.show(notificationTitle, {
        body: notificationMessage,
        tag: `meeting-${payload.meetingId}`,
      });
    }

    return { success: true, queued: true, jobId, count: 0 };
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

    const officialIds = [...new Set(officials?.map(r => r.user_id) || [])];
    if (officialIds.length === 0) return [];

    const { data: activeOfficials } = await supabase
      .from('profiles')
      .select('id')
      .in('id', officialIds)
      .eq('status', 'active');

    return activeOfficials?.map(p => p.id) || [];
  } catch (error) {
    console.error('Error fetching meeting officials:', error);
    return [];
  }
};

/**
 * Determine notification recipients based on the selected meeting audience.
 */
export const getNotificationRecipients = async (
  meetingType: string,
  recipientScope?: MeetingRecipientScope
): Promise<string[]> => {
  const resolvedScope = recipientScope ?? (meetingType === 'management_committee' ? 'officials' : 'all_members');

  if (resolvedScope === 'officials') {
    return getMeetingOfficials();
  }

  return getMeetingStakeholders();
};
