import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Heart,
  Loader2,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AccessibleButton,
  AccessibleStatus,
  useStatus,
} from '@/components/accessible';
import { useAuth } from '@/hooks/useAuth';
import { usePaginationState } from '@/hooks/usePaginationState';
import {
  type Notification,
  useRealtimeNotificationsEnhanced,
} from '@/hooks/useRealtimeNotificationsEnhanced';
import { supabase } from '@/integrations/supabase/client';
import { enqueueBackgroundJob, shortJobId } from '@/lib/backgroundJobs';
import { getErrorMessage, logError } from '@/lib/errorHandling';
import { sendAnnouncementNotification } from '@/lib/notificationService';
import { hasPermission, normalizeRoles } from '@/lib/rolePermissions';
import { cn } from '@/lib/utils';

type CommunicationsView = 'all' | 'announcements' | 'alerts';
type ReadFilter = 'all' | 'unread' | 'read';

interface CommunicationsPageProps {
  defaultView?: CommunicationsView;
}

const announcementTargetId = (notification: Notification) => {
  const hash = notification.action_url?.split('#')[1];
  return hash ? `announcement-${hash}` : `communication-${notification.id}`;
};

const formatDateGroup = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const formatShortTime = (dateString: string) => {
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
    icon: ShieldCheck,
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

const viewLabels: Record<CommunicationsView, string> = {
  all: 'All',
  announcements: 'Announcements',
  alerts: 'Alerts',
};

const CommunicationsPage = ({ defaultView = 'all' }: CommunicationsPageProps) => {
  const location = useLocation();
  const { user, roles } = useAuth();
  const { status, showSuccess } = useStatus();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useRealtimeNotificationsEnhanced({ applyPreferences: false });

  const [activeView, setActiveView] = useState<CommunicationsView>(defaultView);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pagination = usePaginationState(12);

  const userRoles = normalizeRoles(roles);
  const canCreateAnnouncement = hasPermission(userRoles, 'send_announcements');
  const highlightedId = location.hash.replace('#', '');

  useEffect(() => {
    setActiveView(defaultView);
    setTypeFilter('all');
  }, [defaultView]);

  const counts = useMemo(() => ({
    all: notifications.length,
    announcements: notifications.filter((notification) => notification.type === 'announcement').length,
    alerts: notifications.filter((notification) => notification.type !== 'announcement').length,
  }), [notifications]);

  const availableTypes = useMemo(() => {
    const types = new Set(notifications.map((notification) => notification.type));
    return Array.from(types).sort();
  }, [notifications]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return notifications.filter((notification) => {
      const isAnnouncement = notification.type === 'announcement';
      const matchesView =
        activeView === 'all' ||
        (activeView === 'announcements' && isAnnouncement) ||
        (activeView === 'alerts' && !isAnnouncement);
      const matchesSearch =
        !query ||
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || notification.type === typeFilter;
      const matchesRead =
        readFilter === 'all' ||
        (readFilter === 'unread' && !notification.read) ||
        (readFilter === 'read' && notification.read);

      return matchesView && matchesSearch && matchesType && matchesRead;
    });
  }, [activeView, notifications, readFilter, searchTerm, typeFilter]);

  useEffect(() => {
    pagination.updateTotal(filtered.length);
  }, [filtered.length, pagination]);

  const paginated = useMemo(() => {
    const offset = (pagination.page - 1) * pagination.pageSize;
    return filtered.slice(offset, offset + pagination.pageSize);
  }, [filtered, pagination.page, pagination.pageSize]);

  useEffect(() => {
    if (!highlightedId || paginated.length === 0) return;

    const target = paginated.find((notification) => (
      notification.id === highlightedId ||
      announcementTargetId(notification) === `announcement-${highlightedId}`
    ));
    if (!target) return;

    const timer = window.setTimeout(() => {
      const element = document.getElementById(
        target.type === 'announcement' ? announcementTargetId(target) : `communication-${target.id}`
      );
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [highlightedId, paginated]);

  const publishAnnouncement = async () => {
    if (!user?.id) {
      setError('You must be signed in to publish an announcement.');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: announcement, error: insertError } = await supabase
        .from('announcements')
        .insert({
          title: formData.title.trim(),
          content: formData.content.trim(),
          priority: formData.priority,
          created_by: user.id,
          published: true,
          published_at: new Date().toISOString(),
        })
        .select('id,title,content')
        .single();

      if (insertError) throw insertError;

      if (announcement?.id) {
        void sendAnnouncementNotification(
          announcement.id,
          announcement.title,
          announcement.content
        ).catch((notifyError) => {
          logError(notifyError, 'CommunicationsPage.sendAnnouncementNotification', 'warn');
        });
      }

      setFormData({ title: '', content: '', priority: 'normal' });
      setIsDialogOpen(false);
      setSuccess('Announcement published. Member communications are being queued.');
      showSuccess('Announcement queued', 2000);
    } catch (publishError) {
      const message = getErrorMessage(publishError);
      logError(publishError, 'CommunicationsPage.publishAnnouncement');
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const queueAnnouncementExport = async () => {
    try {
      const jobId = await enqueueBackgroundJob({
        jobType: 'announcement_export',
        payload: {
          search: searchTerm.trim() || null,
          readFilter,
          format: 'csv',
          requestedAt: new Date().toISOString(),
        },
        priority: 8,
        dedupeKey: `announcement_export:${readFilter}:${searchTerm.trim() || 'all'}`,
      });
      setSuccess(`Announcement export queued. Job ${shortJobId(jobId)}`);
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    }
  };

  const openCommunication = (notification: Notification) => {
    if (!notification.read) {
      void markAsRead(notification.id);
    }

    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const renderItem = (notification: Notification) => {
    const config = typeConfig[notification.type] ?? typeConfig.system;
    const Icon = config.icon;
    const cardId = notification.type === 'announcement'
      ? announcementTargetId(notification)
      : `communication-${notification.id}`;

    return (
      <Card
        key={notification.id}
        id={cardId}
        className={cn(
          'overflow-hidden border-l-4 transition-all',
          notification.read
            ? 'border-l-transparent bg-card hover:bg-accent/30'
            : 'border-l-primary bg-primary/5 hover:bg-primary/10',
          highlightedId && (cardId.endsWith(highlightedId) || notification.id === highlightedId) && 'ring-2 ring-primary/30'
        )}
      >
        <CardContent
          className={cn('p-4', notification.action_url && 'cursor-pointer')}
          onClick={() => openCommunication(notification)}
        >
          <div className="flex items-start gap-4">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', config.badge)}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={cn(
                    'line-clamp-1 font-semibold',
                    notification.read ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {notification.title}
                  </h3>
                  <p className={cn(
                    'mt-1 text-sm leading-relaxed',
                    activeView === 'announcements' ? 'line-clamp-4' : 'line-clamp-2',
                    notification.read ? 'text-muted-foreground' : 'text-foreground/80'
                  )}>
                    {notification.message}
                  </p>
                </div>
                {!notification.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border text-xs font-medium', config.chip)}>
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatShortTime(notification.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {!notification.read && (
                    <AccessibleButton
                      size="sm"
                      variant="ghost"
                      ariaLabel="Mark communication as read"
                      onClick={(event) => {
                        event.stopPropagation();
                        void markAsRead(notification.id);
                        showSuccess('Marked as read', 1500);
                      }}
                      className="h-8 px-2"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </AccessibleButton>
                  )}
                  <AccessibleButton
                    size="sm"
                    variant="ghost"
                    ariaLabel="Delete communication"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteNotification(notification.id);
                      showSuccess('Communication cleared', 1500);
                    }}
                    className="h-8 px-2"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </AccessibleButton>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <AccessibleStatus
        message={status.message}
        type={status.type}
        isVisible={status.isVisible}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Communications</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread item${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeView === 'announcements' && canCreateAnnouncement && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <AccessibleButton className="gap-2" ariaLabel="Create announcement">
                  <Plus className="h-4 w-4" />
                  New Announcement
                </AccessibleButton>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Publish Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="communication-title" className="text-sm font-medium">Title</label>
                    <Input
                      id="communication-title"
                      value={formData.title}
                      onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Announcement title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="communication-content" className="text-sm font-medium">Content</label>
                    <Textarea
                      id="communication-content"
                      value={formData.content}
                      onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))}
                      placeholder="What should members know?"
                      className="min-h-32"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="communication-priority" className="text-sm font-medium">Priority</label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData((current) => ({ ...current, priority: value }))}
                    >
                      <SelectTrigger id="communication-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <AccessibleButton
                      variant="outline"
                      ariaLabel="Cancel announcement"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </AccessibleButton>
                    <AccessibleButton
                      ariaLabel="Publish announcement"
                      onClick={publishAnnouncement}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Publish
                    </AccessibleButton>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {activeView === 'announcements' && canCreateAnnouncement && (
            <AccessibleButton
              variant="outline"
              ariaLabel="Export announcements"
              onClick={() => void queueAnnouncementExport()}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </AccessibleButton>
          )}

          {unreadCount > 0 && (
            <AccessibleButton
              variant="outline"
              onClick={() => void markAllAsRead()}
              className="gap-2"
              ariaLabel="Mark all communications as read"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </AccessibleButton>
          )}
        </div>
      </div>

      {(error || success) && !isDialogOpen && (
        <div className={cn(
          'rounded-md border p-3 text-sm',
          error ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-green-300 bg-green-50 text-green-800'
        )}>
          {error || success}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(viewLabels) as CommunicationsView[]).map((view) => (
          <AccessibleButton
            key={view}
            variant={activeView === view ? 'default' : 'outline'}
            ariaLabel={`Show ${viewLabels[view].toLowerCase()}`}
            ariaPressed={activeView === view}
            onClick={() => {
              setActiveView(view);
              setTypeFilter('all');
              pagination.goToPage(1);
            }}
            className="gap-2"
          >
            {view === 'announcements' ? <Megaphone className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {viewLabels[view]}
            <Badge variant="secondary" className="ml-1">
              {counts[view]}
            </Badge>
          </AccessibleButton>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  pagination.goToPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                pagination.goToPage(1);
              }}
            >
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {(typeConfig[type] ?? typeConfig.system).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={readFilter}
              onValueChange={(value) => {
                setReadFilter(value as ReadFilter);
                pagination.goToPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'communication' : 'communications'} found
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : paginated.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No communications found</p>
            <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-5">
            {Array.from(new Set(paginated.map((notification) => formatDateGroup(notification.created_at)))).map((dateGroup) => (
              <section key={dateGroup} className="space-y-2">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dateGroup}
                </h3>
                <div className="space-y-2">
                  {paginated
                    .filter((notification) => formatDateGroup(notification.created_at) === dateGroup)
                    .map(renderItem)}
                </div>
              </section>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}
              -{Math.min(pagination.page * pagination.pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <AccessibleButton
                variant="outline"
                ariaLabel="Previous page"
                onClick={() => pagination.previousPage()}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </AccessibleButton>
              <span className="text-sm">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)}
              </span>
              <AccessibleButton
                variant="outline"
                ariaLabel="Next page"
                onClick={() => pagination.nextPage()}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </AccessibleButton>
            </div>
          </div>

          {filtered.length > 0 && (
            <div className="flex justify-center pt-2">
              <AccessibleButton
                variant="outline"
                ariaLabel="Clear all communications"
                onClick={() => {
                  if (window.confirm('Clear all communications from your inbox?')) {
                    void deleteAllNotifications();
                    showSuccess('Communications cleared', 2000);
                  }
                }}
                className="gap-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear Inbox
              </AccessibleButton>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommunicationsPage;
