import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 'announcement' | 'contribution' | 'welfare' | 'approval' | 'meeting' | 'system';

export interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
}

export interface SendBulkNotificationParams {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
}

/**
 * Send a notification to a single user
 */
export const sendNotification = async (params: SendNotificationParams) => {
  try {
    const { userId, title, message, type, actionUrl } = params;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl || null,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send notifications to multiple users
 */
export const sendBulkNotifications = async (params: SendBulkNotificationParams) => {
  try {
    const { userIds, title, message, type, actionUrl } = params;

    const notificationsData = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      action_url: actionUrl || null,
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationsData)
      .select();

    if (error) throw error;
    return { success: true, data, count: data?.length || 0 };
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw error;
  }
};

/**
 * Send announcement notification to all members
 */
export const sendAnnouncementNotification = async (
  announcementId: string,
  title: string,
  message: string
) => {
  try {
    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id');

    if (membersError) throw membersError;
    if (!members || members.length === 0) return { success: true, count: 0 };

    // Send notification to all members
    const userIds = members.map(m => m.id);
    const result = await sendBulkNotifications({
      userIds,
      title,
      message,
      type: 'announcement',
      actionUrl: `/dashboard/announcements#${announcementId}`,
    });

    return result;
  } catch (error) {
    console.error('Error sending announcement notification:', error);
    throw error;
  }
};

/**
 * Send contribution notification
 */
export const sendContributionNotification = async (
  userId: string,
  amount: number,
  status: 'pending' | 'completed' | 'failed'
) => {
  const statusMessages = {
    pending: 'Your contribution payment is being processed',
    completed: `Your contribution of KES ${amount} has been recorded successfully`,
    failed: 'Your contribution payment failed. Please try again.',
  };

  return sendNotification({
    userId,
    title: 'Contribution Update',
    message: statusMessages[status],
    type: 'contribution',
    actionUrl: '/dashboard/contributions',
  });
};

/**
 * Send approval notification
 */
export const sendApprovalNotification = async (
  userId: string,
  itemType: string,
  itemId: string,
  approved: boolean
) => {
  const message = approved
    ? `Your ${itemType} has been approved`
    : `Your ${itemType} has been rejected`;

  return sendNotification({
    userId,
    title: `${itemType} ${approved ? 'Approved' : 'Rejected'}`,
    message,
    type: 'approval',
    actionUrl: `/dashboard/approvals#${itemId}`,
  });
};

/**
 * Send meeting notification
 */
export const sendMeetingNotification = async (
  userId: string,
  meetingTitle: string,
  meetingDate: string
) => {
  return sendNotification({
    userId,
    title: 'Meeting Scheduled',
    message: `${meetingTitle} is scheduled for ${new Date(meetingDate).toLocaleDateString()}`,
    type: 'meeting',
    actionUrl: '/dashboard/meetings',
  });
};

/**
 * Send welfare case notification
 */
export const sendWelfareCaseNotification = async (
  userId: string,
  caseName: string,
  caseId: string
) => {
  return sendNotification({
    userId,
    title: 'Welfare Case Update',
    message: `There's an update on the welfare case: ${caseName}`,
    type: 'welfare',
    actionUrl: `/dashboard/welfare#${caseId}`,
  });
};

/**
 * Clear all notifications for a user
 */
export const clearUserNotifications = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error clearing notifications:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
};
