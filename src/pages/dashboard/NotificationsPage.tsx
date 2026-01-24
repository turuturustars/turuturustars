import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AccessibleButton,
  AccessibleStatus,
  useStatus,
} from '@/components/accessible';
import {
  Bell,
  Trash2,
  Check,
  CheckCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useRealtimeNotificationsEnhanced } from '@/hooks/useRealtimeNotificationsEnhanced';
import { cn } from '@/lib/utils';

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useRealtimeNotificationsEnhanced();
  const { status, showSuccess } = useStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filtered = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesRead =
      readFilter === 'all' ||
      (readFilter === 'unread' && !notification.read) ||
      (readFilter === 'read' && notification.read);

    return matchesSearch && matchesType && matchesRead;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'contribution':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'welfare':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'meeting':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'system':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      announcement: '📢',
      contribution: '💰',
      welfare: '❤️',
      approval: '✓',
      meeting: '📅',
      system: '⚙️',
    };
    return icons[type] || '📌';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / 3600000);
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / 60000);
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <AccessibleStatus
        message={status.message}
        type={status.type}
        isVisible={status.isVisible}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-100">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <AccessibleButton onClick={() => markAllAsRead()} className="gap-2" ariaLabel={`Mark all ${unreadCount} unread notifications as read`}>
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </AccessibleButton>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="announcement">Announcements</SelectItem>
            <SelectItem value="contribution">Contributions</SelectItem>
            <SelectItem value="welfare">Welfare</SelectItem>
            <SelectItem value="approval">Approvals</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select value={readFilter} onValueChange={(value: any) => setReadFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? 'notification' : 'notifications'} found
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No notifications found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      {filtered.length > 0 && (
        <>
          {/* Group by date */}
          <div className="space-y-4">
            {Array.from(
              new Map(
                filtered.map(n => {
                  const date = new Date(n.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  });
                  return [date, n];
                })
              )
            ).map(([dateGroup, firstNotification]) => (
              <div key={dateGroup}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 px-1">
                  {dateGroup}
                </h3>

                <div className="space-y-2">
                  {filtered
                    .filter(
                      n =>
                        new Date(n.created_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        }) === dateGroup
                    )
                    .map(notification => (
                      <Card
                        key={notification.id}
                        className={cn(
                          'overflow-hidden transition-all border-l-4',
                          notification.read
                            ? 'border-l-gray-200 bg-white hover:bg-gray-50'
                            : 'border-l-blue-500 bg-blue-50/50 hover:bg-blue-50'
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <span className="text-2xl flex-shrink-0 mt-1">
                              {getTypeIcon(notification.type)}
                            </span>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <h4
                                    className={cn(
                                      'font-semibold line-clamp-1',
                                      notification.read ? 'text-gray-700' : 'text-gray-900'
                                    )}
                                  >
                                    {notification.title}
                                  </h4>
                                  <p
                                    className={cn(
                                      'text-sm line-clamp-2 mt-1',
                                      notification.read ? 'text-gray-500' : 'text-gray-700'
                                    )}
                                  >
                                    {notification.message}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-2" />
                                )}
                              </div>

                              {/* Meta Info */}
                              <div className="flex items-center justify-between gap-2 mt-3">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={cn(
                                      'border text-xs font-medium',
                                      getTypeColor(notification.type)
                                    )}
                                  >
                                    {notification.type}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(notification.created_at)}
                                  </span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1">
                                  {!notification.read && (
                                    <AccessibleButton
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        markAsRead(notification.id);
                                        showSuccess('Marked as read', 2000);
                                      }}
                                      className="h-8 px-2 text-xs"
                                      ariaLabel="Mark notification as read"
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                    </AccessibleButton>
                                  )}
                                  <AccessibleButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      deleteNotification(notification.id);
                                      showSuccess('Notification deleted', 2000);
                                    }}
                                    className="h-8 px-2 text-xs"
                                    ariaLabel="Delete notification"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </AccessibleButton>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Clear All Button */}
          {filtered.length > 0 && (
            <div className="flex justify-center pt-4">
              <AccessibleButton
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to delete all notifications?')) {
                    deleteAllNotifications();
                    showSuccess('All notifications cleared', 2000);
                  }
                }}
                className="text-red-600 hover:bg-red-50"
                ariaLabel={`Delete all ${filtered.length} notifications`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all notifications
              </AccessibleButton>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
