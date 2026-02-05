import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean | null;
  sent_via: string[] | null;
  created_at: string | null;
  action_url?: string | null;
}

const NotificationBellEnhanced = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({ showSettings: false });

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast({ title: '✓ All notifications marked as read' });
    },
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-purple-100 text-purple-800';
      case 'contribution':
        return 'bg-green-100 text-green-800';
      case 'welfare':
        return 'bg-blue-100 text-blue-800';
      case 'approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'meeting':
        return 'bg-indigo-100 text-indigo-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
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

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
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
    return date.toLocaleDateString();
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    } catch (e) {
      console.log('Could not play notification sound:', e);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        {/* Header */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNotificationSettings({ showSettings: !notificationSettings.showSettings })}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-80 sm:h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-accent transition-colors cursor-pointer border-l-4',
                    notification.read ? 'border-l-transparent' : 'border-l-primary bg-primary/5'
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      markAsReadMutation.mutate(notification.id);
                    }
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  <div className="flex gap-3">
                    {/* Type Icon */}
                    <span className="text-xl flex-shrink-0">
                      {getTypeIcon(notification.type)}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                          'text-sm font-semibold line-clamp-1',
                          notification.read ? 'text-muted-foreground' : 'text-foreground'
                        )}>
                          {notification.title}
                        </h4>
                        <Badge className={cn('flex-shrink-0 text-xs', getTypeColor(notification.type))}>
                          {notification.type}
                        </Badge>
                      </div>
                      <p className={cn(
                        'text-xs line-clamp-2',
                        notification.read ? 'text-muted-foreground' : 'text-foreground'
                      )}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          disabled={markAsReadMutation.isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications && notifications.length > 0 && unreadCount > 0 && (
          <div className="p-3 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="w-full text-xs"
            >
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBellEnhanced;
