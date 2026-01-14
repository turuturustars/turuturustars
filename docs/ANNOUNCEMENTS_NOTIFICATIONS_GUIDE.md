# Announcements & Notifications System - Integration Guide

## 📋 Overview

This comprehensive system provides enterprise-grade announcements and notifications functionality for the Turuturu Stars application.

### What's Included

#### **Announcements Module** 📢
- ✅ **AnnouncementsList** - Public list of published announcements
- ✅ **AnnouncementsManager** - Full CRUD for admins/secretaries
- ✅ **ScheduledAnnouncementsManager** - Schedule announcements for future publishing
- ✅ **AnnouncementsAnalytics** - Statistics and analytics dashboard
- ✅ **Notification Service** - Helper functions for sending notifications

#### **Notifications Module** 🔔
- ✅ **NotificationBellEnhanced** - Bell icon with popover dropdown
- ✅ **NotificationsPage** - Full notifications management page
- ✅ **useRealtimeNotificationsEnhanced** - Real-time hook with Supabase
- ✅ **NotificationPreferences** - User preferences management
- ✅ **Notification Service** - API for sending notifications programmatically

---

## 🔧 Integration Steps

### 1. **Add Announcements to DashboardSidebar**

In `src/components/dashboard/DashboardSidebar.tsx`, add to role-specific links:

```tsx
const roleSpecificLinks = () => {
  // ... existing code ...
  
  if (hasRole(userRoles, 'admin') || hasRole(userRoles, 'secretary')) {
    return [
      // ... existing links ...
      { label: 'Manage Announcements', href: '/dashboard/announcements-manager', icon: Megaphone },
      { label: 'Scheduled Announcements', href: '/dashboard/scheduled-announcements', icon: Calendar },
      { label: 'Announcements Analytics', href: '/dashboard/announcements-analytics', icon: TrendingUp },
    ];
  }
};
```

### 2. **Add Notifications Bell to Header**

In `src/components/dashboard/DashboardHeader.tsx`:

```tsx
import NotificationBellEnhanced from '@/components/notifications/NotificationBellEnhanced';

export default function DashboardHeader() {
  return (
    <header className="...">
      {/* ... existing code ... */}
      <div className="flex items-center gap-4">
        <NotificationBellEnhanced />
        {/* ... other header items ... */}
      </div>
    </header>
  );
}
```

### 3. **Add Notifications Page Route**

In `src/App.tsx`:

```tsx
import NotificationsPage from '@/pages/dashboard/NotificationsPage';
import AnnouncementsList from '@/components/announcements/AnnouncementsList';
import AnnouncementsManager from '@/components/announcements/AnnouncementsManager';
import ScheduledAnnouncementsManager from '@/components/announcements/ScheduledAnnouncementsManager';
import AnnouncementsAnalytics from '@/components/announcements/AnnouncementsAnalytics';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';

// In your routes:
<Route path="/dashboard/notifications" element={<NotificationsPage />} />
<Route path="/dashboard/announcements" element={<AnnouncementsList />} />
<Route path="/dashboard/announcements-manager" element={<AnnouncementsManager />} />
<Route path="/dashboard/scheduled-announcements" element={<ScheduledAnnouncementsManager />} />
<Route path="/dashboard/announcements-analytics" element={<AnnouncementsAnalytics />} />
<Route path="/dashboard/notification-preferences" element={<NotificationPreferences />} />
```

### 4. **Update Navigation**

Add to member links in DashboardSidebar:

```tsx
const memberLinks = [
  // ... existing ...
  { label: 'Announcements', href: '/dashboard/announcements', icon: Megaphone },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Notification Settings', href: '/dashboard/notification-preferences', icon: Settings },
];
```

---

## 📡 Using the Notification Service

### Send Single Notification

```tsx
import { sendNotification } from '@/lib/notificationService';

await sendNotification({
  userId: 'user-uuid',
  title: 'Welcome!',
  message: 'You have been added to the group',
  type: 'announcement',
  actionUrl: '/dashboard/announcements'
});
```

### Send Bulk Notifications

```tsx
import { sendBulkNotifications } from '@/lib/notificationService';

await sendBulkNotifications({
  userIds: ['user1-uuid', 'user2-uuid', 'user3-uuid'],
  title: 'Meeting Reminder',
  message: 'General assembly meeting tomorrow at 6 PM',
  type: 'meeting',
  actionUrl: '/dashboard/meetings'
});
```

### Send Announcement to All Members

```tsx
import { sendAnnouncementNotification } from '@/lib/notificationService';

await sendAnnouncementNotification(
  'announcement-id',
  'Important Update',
  'Please read the announcement for more details'
);
```

### Contribution Update Notification

```tsx
import { sendContributionNotification } from '@/lib/notificationService';

// When payment succeeds
await sendContributionNotification(userId, 5000, 'completed');

// When payment fails
await sendContributionNotification(userId, 5000, 'failed');
```

### Meeting Notification

```tsx
import { sendMeetingNotification } from '@/lib/notificationService';

await sendMeetingNotification(
  userId,
  'General Assembly',
  '2026-02-15T18:00:00Z'
);
```

---

## 🎯 Features & Capabilities

### Announcements

| Feature | Details |
|---------|---------|
| **Publishing** | Publish immediately or schedule for later |
| **Priority Levels** | Urgent, High, Normal, Low |
| **Search & Filter** | Full-text search and priority filtering |
| **Analytics** | View stats, trends, and distribution charts |
| **Role-Based** | Only admins/secretaries can manage |
| **Auto-Notify** | Automatically sends notifications when published |
| **Time Formatting** | Relative dates (e.g., "2m ago", "Yesterday") |

### Notifications

| Feature | Details |
|---------|---------|
| **Real-time Updates** | Live updates via Supabase subscriptions |
| **Notification Types** | 6 types: announcement, contribution, welfare, approval, meeting, system |
| **Unread Tracking** | Badge shows unread count |
| **Mark as Read** | Individual or bulk marking |
| **Delete** | Individual or clear all |
| **Preferences** | Users control what they receive |
| **Sound** | Optional notification sounds |
| **Email Digest** | Optional email summaries |

### User Experience

- 🎨 **World-class UI** - Gradient headers, smooth animations
- 📱 **Fully Responsive** - Mobile-optimized layout
- ♿ **Accessible** - ARIA labels, keyboard navigation
- ⚡ **Fast** - React Query caching and optimization
- 🔄 **Real-time** - Instant updates with Supabase
- 🎯 **Role-based** - Permission checks throughout

---

## 📊 Database Tables Required

Ensure these tables exist in Supabase:

### `announcements`
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `notification_preferences`
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enable_announcements BOOLEAN DEFAULT TRUE,
  enable_contributions BOOLEAN DEFAULT TRUE,
  enable_welfare BOOLEAN DEFAULT TRUE,
  enable_meetings BOOLEAN DEFAULT TRUE,
  enable_approvals BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sound_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 RLS Policies

Apply these RLS policies to tables:

### Announcements
- Anyone can view published announcements
- Only admins/secretaries can create/edit
- Only admins can delete

### Notifications
- Users can only view their own notifications
- System can insert notifications for any user
- Users can update/delete their own notifications

### Notification Preferences
- Users can only view/edit their own preferences

---

## 📚 Component Props & Usage

### NotificationBellEnhanced
```tsx
<NotificationBellEnhanced />
// No props required - uses user context from useAuth
```

### AnnouncementsList
```tsx
<AnnouncementsList />
// Shows published announcements with search/filter
```

### AnnouncementsManager
```tsx
<AnnouncementsManager />
// Admin panel for creating/editing announcements
```

### ScheduledAnnouncementsManager
```tsx
<ScheduledAnnouncementsManager />
// Schedule future announcements
```

### AnnouncementsAnalytics
```tsx
<AnnouncementsAnalytics />
// Dashboard with stats and charts
```

### NotificationPreferences
```tsx
<NotificationPreferences />
// User settings for notifications
```

### NotificationsPage
```tsx
<NotificationsPage />
// Full notifications management page
```

---

## 🚀 Advanced Usage

### Custom Notification Types

Add new types to the `NotificationType` type in `src/lib/notificationService.ts`:

```tsx
export type NotificationType = 
  | 'announcement' 
  | 'contribution' 
  | 'welfare' 
  | 'approval' 
  | 'meeting' 
  | 'system'
  | 'custom'; // Add custom type
```

### Real-time Subscription

Use the hook in any component:

```tsx
import { useRealtimeNotificationsEnhanced } from '@/hooks/useRealtimeNotificationsEnhanced';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
  } = useRealtimeNotificationsEnhanced();

  return (
    // Your component
  );
}
```

### Batch Operations

For processing multiple notifications:

```tsx
const { markAllAsRead, deleteAllNotifications } = useRealtimeNotificationsEnhanced();

// Mark all as read
await markAllAsRead();

// Delete all
await deleteAllNotifications();
```

---

## 🎨 Customization

### Colors & Branding

Edit color mappings in component files:

```tsx
// In NotificationBellEnhanced
const getTypeColor = (type: string) => {
  switch (type) {
    case 'announcement':
      return 'bg-purple-100 text-purple-800'; // Change these
    // ...
  }
};
```

### Notification Sound

Customize the beep sound in `useRealtimeNotificationsEnhanced`:

```tsx
const playNotificationSound = () => {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = 800; // Change frequency (Hz)
  // ...
};
```

---

## 🐛 Troubleshooting

### Notifications Not Appearing
- Check RLS policies on notifications table
- Verify user_id is correctly set
- Check browser console for errors

### Real-time Not Working
- Ensure Supabase connection is active
- Check Realtime is enabled in Supabase dashboard
- Verify table RLS policies allow inserts

### Performance Issues
- Use React Query's `refetchInterval` to control refresh rate
- Implement pagination for large notification lists
- Clear old notifications regularly

---

## 📝 Future Enhancements

Potential features to add:
- [ ] Email notification summaries
- [ ] SMS notifications
- [ ] Advanced scheduling (recurring)
- [ ] Notification read receipts
- [ ] Announcement expiration dates
- [ ] Community-wide broadcast history
- [ ] Notification priority queue
- [ ] Notification categories/tags

---

## 📞 Support

For issues or questions:
1. Check the database schema
2. Verify RLS policies
3. Review browser console
4. Check Supabase logs
5. Verify user authentication

---

**Last Updated:** January 14, 2026
**Status:** Complete and Production Ready ✅
