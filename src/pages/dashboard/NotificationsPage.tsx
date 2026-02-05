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
  Megaphone,
  DollarSign,
  Heart,
  CheckCircle2,
  Calendar,
  MessageSquare,
  CreditCard,
  Settings2,
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

  const typeConfig: Record<string, { label: string; icon: typeof Bell; badge: string; chip: string }> = {
    announcement: {
      label: 'Announcement',
      icon: Megaphone,
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      chip: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    },
    contribution: {
      label: 'Contribution',
      icon: DollarSign,
      badge: 'bg-green-100 text-green-800 border-green-200',
      chip: 'bg-green-500/10 text-green-700 dark:text-green-300',
    },
    welfare: {
      label: 'Welfare',
      icon: Heart,
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    },
    approval: {
      label: 'Approval',
      icon: CheckCircle2,
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    meeting: {
      label: 'Meeting',
      icon: Calendar,
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      chip: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    },
    message: {
      label: 'Message',
      icon: MessageSquare,
      badge: 'bg-violet-100 text-violet-800 border-violet-200',
      chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
    private_message: {
      label: 'Message',
      icon: MessageSquare,
      badge: 'bg-violet-100 text-violet-800 border-violet-200',
      chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
    transaction: {
      label: 'Transaction',
      icon: CreditCard,
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    system: {
      label: 'System',
      icon: Settings2,
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      chip: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
    },
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">
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
      <Card className="border-2 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="transaction">Transactions</SelectItem>
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
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'notification' : 'notifications'} found
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No notifications found</p>
            <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
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
            ).map(([dateGroup]) => (
              <div key={dateGroup}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
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
                            ? 'border-l-transparent bg-card hover:bg-accent/30'
                            : 'border-l-primary bg-primary/5 hover:bg-primary/10'
                        )}
                      >
                        <CardContent
                          className={cn(
                            'p-4',
                            notification.action_url && 'cursor-pointer'
                          )}
                          onClick={() => {
                            if (notification.action_url) {
                              window.location.href = notification.action_url;
                            }
                          }}
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            {(() => {
                              const config = typeConfig[notification.type] ?? typeConfig.system;
                              const Icon = config.icon;
                              return (
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', config.badge)}>
                                  <Icon className="w-5 h-5" />
                                </div>
                              );
                            })()}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <h4
                                    className={cn(
                                      'font-semibold line-clamp-1',
                                      notification.read ? 'text-muted-foreground' : 'text-foreground'
                                    )}
                                  >
                                    {notification.title}
                                  </h4>
                                  <p
                                    className={cn(
                                      'text-sm line-clamp-2 mt-1',
                                      notification.read ? 'text-muted-foreground' : 'text-foreground/80'
                                    )}
                                  >
                                    {notification.message}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                                )}
                              </div>

                              {/* Meta Info */}
                              <div className="flex items-center justify-between gap-2 mt-3">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={cn(
                                      'border text-xs font-medium',
                                      (typeConfig[notification.type] ?? typeConfig.system).chip
                                    )}
                                  >
                                    {(typeConfig[notification.type] ?? typeConfig.system).label}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(notification.created_at)}
                                  </span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1">
                                  {!notification.read && (
                                    <AccessibleButton
                                      size="sm"
                                      variant="ghost"
                                      onClick={(event) => {
                                        event.stopPropagation();
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
                                    onClick={(event) => {
                                      event.stopPropagation();
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
