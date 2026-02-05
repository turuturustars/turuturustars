import { useState } from 'react';
import { Bell, CheckCheck, Trash2, DollarSign, HandHeart, Megaphone, UserCheck, Settings, Calendar, MessageSquare, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'contribution':
        return {
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20',
          icon: DollarSign,
          label: 'Contribution'
        };
      case 'welfare':
        return {
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20',
          icon: HandHeart,
          label: 'Welfare'
        };
      case 'announcement':
        return {
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20',
          icon: Megaphone,
          label: 'Announcement'
        };
      case 'approval':
        return {
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20',
          icon: UserCheck,
          label: 'Approval'
        };
      case 'meeting':
        return {
          color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20',
          icon: Calendar,
          label: 'Meeting'
        };
      case 'message':
      case 'private_message':
        return {
          color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20',
          icon: MessageSquare,
          label: 'Message'
        };
      case 'transaction':
        return {
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20',
          icon: CreditCard,
          label: 'Transaction'
        };
      default:
        return {
          color: 'bg-muted text-muted-foreground border-border/50',
          icon: Bell,
          label: 'Notification'
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((notification) => !notification.read)
    : notifications;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative h-10 w-10 rounded-xl transition-all duration-200",
            "hover:bg-accent active:scale-95",
            isOpen && "bg-accent text-primary"
          )}
        >
          <Bell className={cn(
            "w-5 h-5 transition-all duration-200",
            unreadCount > 0 && "animate-pulse",
            isOpen && "scale-110"
          )} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-destructive/20 animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="end" 
        className="w-[calc(100vw-2rem)] sm:w-[420px] p-0 border-border/50 shadow-2xl bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-accent/40 via-accent/20 to-transparent">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-base">Notifications</h4>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-3 hover:bg-accent/80 rounded-lg gap-1.5 transition-all hover:scale-105 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-transparent via-accent/10 to-transparent">
          <button
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-full transition-all',
              filter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-full transition-all',
              filter === 'unread'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {filteredNotifications.length} {filteredNotifications.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[320px] sm:h-[420px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[280px] sm:h-[360px] p-8 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent via-accent to-accent/50 flex items-center justify-center border border-border/50">
                  <Bell className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </div>
              <h3 className="font-semibold text-base mb-1">
                {filter === 'unread' ? 'No unread alerts' : 'All caught up!'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-[200px]">
                {filter === 'unread'
                  ? 'You are up to date'
                  : 'You have no notifications at the moment'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredNotifications.map((notification, index) => {
                const typeConfig = getTypeConfig(notification.type);
                const Icon = typeConfig.icon;
                
                return (
                  <button
                    key={notification.id}
                    className={cn(
                      'group w-full p-4 text-left transition-all duration-200 relative overflow-hidden',
                      'hover:bg-accent/60 active:scale-[0.99]',
                      !notification.read && 'bg-accent/20'
                    )}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      if (notification.action_url) {
                        window.location.href = notification.action_url;
                      }
                    }}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {/* Unread indicator line */}
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary to-primary/50" />
                    )}
                    
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                        "border",
                        typeConfig.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            className={cn(
                              'text-[10px] px-2 py-0.5 font-semibold border',
                              typeConfig.color
                            )}
                          >
                            {typeConfig.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className={cn(
                          "font-semibold text-sm leading-tight line-clamp-2",
                          !notification.read ? "text-foreground" : "text-foreground/80"
                        )}>
                          {notification.title}
                        </p>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/50 p-3 bg-gradient-to-t from-accent/20 to-transparent">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-9 text-xs font-medium hover:bg-accent/80 rounded-lg transition-all hover:scale-[1.02] active:scale-95"
              onClick={() => {
                setIsOpen(false);
                // Navigate to notifications page if you have one
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
