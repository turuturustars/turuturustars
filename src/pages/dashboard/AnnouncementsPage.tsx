import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/rolePermissions';
import { Bell, Megaphone, Loader2, Plus, AlertCircle, Trash2, Edit2 } from 'lucide-react';

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
  const { user, roles } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const userRoles = roles.map(r => r.role);
  const canCreateAnnouncement = hasPermission(userRoles, 'send_announcements');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const announcementsTable = supabase.from('announcements' as 'announcements') as any;
      const { data, error } = await announcementsTable
        .select('id, title, content, priority, published_at, created_by')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      
      // Fetch creator information for each announcement
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map((a: any) => a.created_by).filter(Boolean))] as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        
        const announcementsWithCreators = data.map((a: any) => ({
          ...a,
          created_by_profile: profileMap.get(a.created_by),
        }));
        
        setAnnouncements(announcementsWithCreators);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setError('Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !formData.title.trim() || !formData.content.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const announcementsTable = supabase.from('announcements' as 'announcements') as any;
      
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
        const { error } = await announcementsTable
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

        setSuccess('Announcement created successfully!');
      }

      setFormData({ title: '', content: '', priority: 'normal' });
      setIsEditingId(null);
      setIsDialogOpen(false);
      
      // Refresh announcements list
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      setError('Failed to save announcement. Please try again.');
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
      console.error('Error deleting announcement:', error);
      setError('Failed to delete announcement. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const canEditOrDelete = (createdById: string) => {
    return canCreateAnnouncement && (user?.id === createdById || userRoles.includes('admin'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Announcements</h2>
          <p className="text-muted-foreground">Stay updated with CBO news and updates</p>
        </div>
        {canCreateAnnouncement && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Announcement
              </Button>
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
                  <Button
                    onClick={handleCreateAnnouncement}
                    disabled={isSaving}
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
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setIsEditingId(null);
                      setFormData({ title: '', content: '', priority: 'normal' });
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Cancel
                  </Button>
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
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAnnouncement(announcement)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          disabled={isDeleting === announcement.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isDeleting === announcement.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;