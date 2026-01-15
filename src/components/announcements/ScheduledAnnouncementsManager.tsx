import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle,
  Play,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { sendAnnouncementNotification } from '@/lib/notificationService';
import { hasRole } from '@/lib/rolePermissions';
import { cn } from '@/lib/utils';

interface ScheduledAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  scheduled_for: string;
  published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
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
    priority: 'normal' as const,
    scheduledFor: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
  });

  const userRoles = roles.map(r => r.role);
  const canManage = hasRole(userRoles, 'admin') || hasRole(userRoles, 'chairperson');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['scheduled-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', false)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as ScheduledAnnouncement[];
    },
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title.trim() || !formData.content.trim()) {
        throw new Error('Title and content are required');
      }

      const scheduledDateTime = new Date(
        `${formData.scheduledFor}T${formData.scheduledTime}`
      ).toISOString();

      const announcementData = {
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        scheduled_for: scheduledDateTime,
        published: false,
        updated_at: new Date().toISOString(),
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
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast({
        title: '✓ Success',
        description: editingId
          ? 'Announcement scheduled successfully'
          : 'Announcement scheduled successfully',
      });
      resetForm();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: '✗ Error',
        description: error.message || 'Failed to schedule announcement',
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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

  const handleEdit = (announcement: ScheduledAnnouncement) => {
    const date = new Date(announcement.scheduled_for);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      scheduledFor: date.toISOString().split('T')[0],
      scheduledTime: date.toTimeString().slice(0, 5),
    });
    setEditingId(announcement.id);
    setOpen(true);
  };

  if (!canManage) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">You don't have permission to manage scheduled announcements.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-orange-100">
            <Calendar className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Scheduled Announcements</h2>
            <p className="text-sm text-gray-500">Create and manage scheduled announcements</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen);
          if (!newOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Schedule Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Scheduled Announcement' : 'Schedule New Announcement'}
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
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

                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.scheduledFor}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledFor: e.target.value })
                    }
                    disabled={saveMutation.isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledTime: e.target.value })
                    }
                    disabled={saveMutation.isPending}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Announcement'
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
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Announcements List */}
      {!isLoading && (
        <div className="space-y-3">
          {announcements?.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No scheduled announcements</p>
                <p className="text-sm text-gray-400">Schedule one to get started</p>
              </CardContent>
            </Card>
          ) : (
            announcements?.map((announcement) => {
              const isOverdue = new Date(announcement.scheduled_for) < new Date();
              return (
                <Card
                  key={announcement.id}
                  className={cn(
                    'overflow-hidden hover:shadow-md transition-shadow',
                    isOverdue && 'border-orange-300 bg-orange-50'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-base">
                            {announcement.title}
                          </h3>
                          {isOverdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(announcement.scheduled_for).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(announcement.scheduled_for).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {isOverdue && (
                          <Button
                            size="sm"
                            onClick={() => publishMutation.mutate(announcement.id)}
                            disabled={publishMutation.isPending}
                            className="gap-1"
                          >
                            <Play className="w-4 h-4" />
                            Publish Now
                          </Button>
                        )}
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
                            if (confirm('Delete this scheduled announcement?')) {
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
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduledAnnouncementsManager;
