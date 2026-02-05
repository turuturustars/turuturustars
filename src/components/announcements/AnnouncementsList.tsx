import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Megaphone,
  Loader2,
  AlertCircle,
  Clock,
  User,
  ChevronDown,
  Search,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  published: boolean;
  published_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const AnnouncementsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: announcements, isLoading, error } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('public-announcements-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        // Rely on cache invalidation to refresh list
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = announcements?.filter((ann) => {
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || ann.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  }) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-purple-100">
          <Megaphone className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
          <p className="text-sm text-gray-500">Stay updated with latest news and updates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? 'announcement' : 'announcements'} found
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">Failed to load announcements. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filtered.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No announcements found</p>
            <p className="text-sm text-gray-400">Check back soon for updates</p>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {filtered.map((announcement) => (
          <Card
            key={announcement.id}
            className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
            onClick={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                      {announcement.title}
                    </h3>
                    <Badge className={cn(getPriorityColor(announcement.priority), 'border')}>
                      {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                    </Badge>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(announcement.published_at || announcement.created_at)}
                    </div>
                  </div>

                  {/* Preview */}
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {announcement.content}
                  </p>
                </div>

                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform',
                    expandedId === announcement.id && 'rotate-180'
                  )}
                />
              </div>

              {/* Expanded Content */}
              {expandedId === announcement.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3">
                    <Button size="sm" variant="outline" className="text-xs">
                      Mark as Important
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Share
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementsList;
