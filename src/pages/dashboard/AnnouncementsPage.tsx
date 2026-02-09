import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { hasPermission, normalizeRoles } from '@/lib/rolePermissions';
import { searchItems, sortItems } from '@/lib/searchUtils';
import { exportAsCSV } from '@/lib/exportUtils';
import { usePaginationState } from '@/hooks/usePaginationState';
import { getErrorMessage, logError, retryAsync } from '@/lib/errorHandling';
import { Bell, Megaphone, Loader2, Plus, AlertCircle, Trash2, Edit2, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendAnnouncementNotification } from '@/lib/notificationService';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  published_at: string;
  created_by: string;
  created_by_profile?: {
    full_name: string;
  };
}

const AnnouncementsPage = () => {
  const { toast } = useToast();
  const { user, roles } = useAuth();
  const { status, showSuccess } = useStatus();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [newestAnnouncementId, setNewestAnnouncementId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pagination = usePaginationState(10);

  const userRoles = normalizeRoles(roles);
  const canCreateAnnouncement = hasPermission(userRoles, 'send_announcements');

  // Filter and search announcements
  const filteredAnnouncements = useMemo(() => {
    let results = announcements;

    // Search filter
    if (searchTerm) {
      results = searchItems(results, searchTerm, ['title', 'content']);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      results = results.filter((a) => a.priority === priorityFilter);
    }

    // Sort
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      results = [...results].sort((a, b) => {
        const aIndex = priorityOrder[a.priority as keyof typeof priorityOrder] || 999;
        const bIndex = priorityOrder[b.priority as keyof typeof priorityOrder] || 999;
        return aIndex - bIndex;
      });
    } else {
      results = sortItems(results, 'published_at', 'desc');
    }

    return results;
  }, [announcements, searchTerm, priorityFilter, sortBy]);

  // Update pagination when filtered announcements change
  useEffect(() => {
    pagination.updateTotal(filteredAnnouncements.length);
  }, [filteredAnnouncements.length, pagination]);

  const paginatedAnnouncements = useMemo(() => {
    const offset = (pagination.page - 1) * pagination.pageSize;
    return filteredAnnouncements.slice(offset, offset + pagination.pageSize);
  }, [filteredAnnouncements, pagination.page, pagination.pageSize]);

  // Fetch announcements with error handling
  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      setError(null);
      
      await retryAsync(
        async () => {
          const { data, error: fetchError } = await supabase
            .from('announcements')
            .select('id, title, content, priority, published_at, created_by')
            .order('published_at', { ascending: false });

          if (fetchError) throw fetchError;
          setAnnouncements(data || []);
          return data;
        },
        {
          maxRetries: 3,
          delayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt) => {
            logError(`Retrying fetch announcements (attempt ${attempt})`, 'AnnouncementsPage', 'warn');
          },
        }
      );
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      logError(err, 'AnnouncementsPage.fetchAnnouncements');
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Load announcements on mount + realtime updates
  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const newAnnouncement = payload.new as Announcement;
        if (newAnnouncement?.published_at) {
          toast({
            title: '📢 New announcement',
            description: newAnnouncement.title,
          });
          setNewestAnnouncementId(newAnnouncement.id);
          setTimeout(() => setNewestAnnouncementId(null), 5000);
        }
        fetchAnnouncements();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const announcementsTable = supabase.from('announcements' as 'announcements') as any;
      
      if (!user?.id) {
        throw new Error('You must be signed in to manage announcements.');
      }

      if (isEditingId) {
        // Update existing announcement
        const { error } = await announcementsTable
          .update({
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
          })
          .eq('id', isEditingId);

        if (error) throw error;

        setSuccess('Announcement updated successfully!');
      } else {
        // Create new announcement
        const { data: createdAnnouncement, error } = await announcementsTable
          .insert({
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
            created_by: user.id,
            published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Broadcast notifications for new announcements (non-blocking)
        if (createdAnnouncement?.id) {
          try {
            await sendAnnouncementNotification(
              createdAnnouncement.id,
              createdAnnouncement.title,
              createdAnnouncement.content
            );
          } catch (notifyError) {
            logError(notifyError, 'AnnouncementsPage.sendAnnouncementNotification', 'warn');
          }
        }

        setSuccess('Announcement created successfully!');
      }

      setFormData({ title: '', content: '', priority: 'normal' });
      setIsEditingId(null);
      setIsDialogOpen(false);
      
      // Refresh announcements list
      await fetchAnnouncements();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      const details = (error as { details?: string; hint?: string })?.details
        || (error as { hint?: string })?.hint;
      const extendedMessage = details && details !== errorMsg
        ? `${errorMsg} (${details})`
        : errorMsg;
      logError(error, 'AnnouncementsPage.handleCreateAnnouncement');
      setError(extendedMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={colors[priority] || colors.normal}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
    });
    setIsEditingId(announcement.id);
    setIsDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setIsDeleting(announcementId);
    try {
      const announcementsTable = supabase.from('announcements' as 'announcements') as any;
      const { error } = await announcementsTable
        .delete()
        .eq('id', announcementId);

      if (error) throw error;

      setSuccess('Announcement deleted successfully!');
      await fetchAnnouncements();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logError(error, 'AnnouncementsPage.handleDeleteAnnouncement');
      setError(errorMsg);
    } finally {
      setIsDeleting(null);
    }
  };

  const canEditOrDelete = (createdById: string) => {
    return canCreateAnnouncement && (user?.id === createdById || userRoles.includes('admin'));
  };

  return (
    <div className="space-y-6">
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Announcements</h2>
          <p className="text-muted-foreground">Stay updated with CBO news and updates</p>
        </div>
        {canCreateAnnouncement && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <AccessibleButton className="gap-2" ariaLabel="Create new announcement">
                <Plus className="w-4 h-4" />
                New Announcement
              </AccessibleButton>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isEditingId ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-sm text-green-800">{success}</p>
                  </div>
                )}
                <div>
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input
                    id="title"
                    placeholder="Announcement title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="content" className="text-sm font-medium">Content</label>
                  <textarea
                    id="content"
                    placeholder="Announcement content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
                  />
                </div>
                <div>
                  <label htmlFor="priority" className="text-sm font-medium">Priority</label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <AccessibleButton
                    onClick={handleCreateAnnouncement}
                    disabled={isSaving}
                    ariaLabel={isEditingId ? 'Update announcement' : 'Create announcement'}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditingId ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      isEditingId ? 'Update Announcement' : 'Create Announcement'
                    )}
                  </AccessibleButton>
                  <AccessibleButton
                    variant="outline"
                    ariaLabel="Cancel"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setIsEditingId(null);
                      setFormData({ title: '', content: '', priority: 'normal' });
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Cancel
                  </AccessibleButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No announcements</h3>
            <p className="text-muted-foreground mt-1">
              There are no announcements at this time
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search and Filter Bar */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'priority')}
                    className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary flex-1"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="priority">Sort by Priority</option>
                  </select>
                  <AccessibleButton
                    variant="outline"
                    ariaLabel="Export announcements as CSV"
                    onClick={() => {
                      const exportData = filteredAnnouncements.map((a) => ({
                        'Title': a.title,
                        'Priority': a.priority,
                        'Date': new Date(a.published_at).toLocaleDateString(),
                        'Creator': a.created_by_profile?.full_name || 'Unknown',
                      }));
                      exportAsCSV(exportData, { filename: 'announcements' });
                    }}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                  </AccessibleButton>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcements List */}
          <div className="space-y-4">
            {paginatedAnnouncements.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {filteredAnnouncements.length === 0 ? 'No announcements match your search' : 'No announcements to display'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {paginatedAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className={cn(
                newestAnnouncementId === announcement.id && 'ring-2 ring-primary/40 shadow-md'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <p>
                          {new Date(announcement.published_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {announcement.created_by_profile && (
                          <p className="font-medium">By {announcement.created_by_profile.full_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getPriorityBadge(announcement.priority)}
                    {canEditOrDelete(announcement.created_by) && (
                      <div className="flex gap-1">
                        <AccessibleButton
                          variant="ghost"
                          ariaLabel={`Edit announcement: ${announcement.title}`}
                          onClick={() => handleEditAnnouncement(announcement)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </AccessibleButton>
                        <AccessibleButton
                          variant="ghost"
                          ariaLabel={`Delete announcement: ${announcement.title}`}
                          onClick={() => {
                            handleDeleteAnnouncement(announcement.id);
                            showSuccess('Announcement deleted', 1500);
                          }}
                          disabled={isDeleting === announcement.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isDeleting === announcement.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </AccessibleButton>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
              ))
              }
                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, filteredAnnouncements.length)} of {filteredAnnouncements.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <AccessibleButton
                      variant="outline"
                      ariaLabel="Go to previous page"
                      onClick={() => pagination.page > 1 && pagination.goToPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </AccessibleButton>
                    <div className="text-sm">
                      Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                    </div>
                    <AccessibleButton
                      variant="outline"
                      ariaLabel="Go to next page"
                      onClick={() => pagination.page < pagination.totalPages && pagination.goToPage(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </AccessibleButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AnnouncementsPage;
