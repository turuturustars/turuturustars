import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { sendAnnouncementNotification } from '@/lib/notificationService';
import { hasRole, normalizeRoles } from '@/lib/rolePermissions';
import { cn } from '@/lib/utils';

type PriorityType = 'urgent' | 'high' | 'normal' | 'low';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string | null;
}

const ScheduledAnnouncementsManager = () => {
  const { profile, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as PriorityType,
    scheduledFor: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
  });

  const userRoles = normalizeRoles(roles);
  const canManage = hasRole(userRoles, 'admin') || hasRole(userRoles, 'chairperson');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['scheduled-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title.trim() || !formData.content.trim()) {
        throw new Error('Title and content are required');
      }

      const announcementData = {
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        published: false,
      };

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({
            ...announcementData,
            created_by: profile?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast({
        title: '✓ Success',
        description: editingId
          ? 'Announcement updated successfully'
          : 'Announcement saved successfully',
      });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: '✗ Error',
        description: error.message || 'Failed to save announcement',
        variant: 'destructive',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .update({
          published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Send notifications
      const announcement = announcements?.find(a => a.id === id);
      if (announcement) {
        await sendAnnouncementNotification(id, announcement.title, announcement.content);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({
        title: '✓ Published',
        description: 'Announcement published and notifications sent',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '✗ Error',
        description: error.message || 'Failed to publish',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast({ title: '✓ Deleted', description: 'Announcement removed' });
    },
    onError: (error: Error) => {
      toast({
        title: '✗ Error',
        description: error.message || 'Failed to delete',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      scheduledFor: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00',
    });
    setEditingId(null);
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: (announcement.priority as PriorityType) || 'normal',
      scheduledFor: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00',
    });
    setEditingId(announcement.id);
    setOpen(true);
  };

  if (!canManage) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">You don't have permission to manage announcements.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-orange-100">
            <Calendar className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Draft Announcements</h2>
            <p className="text-sm text-muted-foreground">Create and manage draft announcements</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen);
          if (!newOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Announcement' : 'Create New Announcement'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Announcement title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={saveMutation.isPending}
                />
              </div>

              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Detailed announcement content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  disabled={saveMutation.isPending}
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: PriorityType) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Announcement'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Announcements List */}
      {!isLoading && (
        <div className="space-y-3">
          {announcements?.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">No draft announcements</p>
                <p className="text-sm text-muted-foreground">Create one to get started</p>
              </CardContent>
            </Card>
          ) : (
            announcements?.map((announcement) => (
              <Card
                key={announcement.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-base">
                          {announcement.title}
                        </h3>
                        <Badge variant="secondary">Draft</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Created {announcement.created_at ? new Date(announcement.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => publishMutation.mutate(announcement.id)}
                        disabled={publishMutation.isPending}
                        className="gap-1"
                      >
                        <Play className="w-4 h-4" />
                        Publish Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Delete this announcement?')) {
                            deleteMutation.mutate(announcement.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduledAnnouncementsManager;
