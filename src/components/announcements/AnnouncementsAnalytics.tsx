import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  MessageSquare,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { hasRole } from '@/lib/rolePermissions';
import { useAuth } from '@/hooks/useAuth';

interface AnnouncementStats {
  total: number;
  published: number;
  drafts: number;
  byPriority: Record<string, number>;
  recentActivity: Array<{ date: string; count: number }>;
}

const AnnouncementsAnalytics = () => {
  const { roles } = useAuth();
  const userRoles = roles.map(r => r.role);
  const canView = hasRole(userRoles, 'admin') || hasRole(userRoles, 'chairperson');

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['announcements-analytics'],
    queryFn: async () => {
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*');

      if (error) throw error;

      const total = announcements?.length || 0;
      const published = announcements?.filter(a => a.published).length || 0;
      const drafts = total - published;

      // Count by priority
      const byPriority = {
        urgent: 0,
        high: 0,
        normal: 0,
        low: 0,
      };

      announcements?.forEach(a => {
        byPriority[a.priority as keyof typeof byPriority]++;
      });

      // Get recent activity (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const recentActivity = last7Days.map(date => {
        const count = announcements?.filter(
          a => a.created_at?.split('T')[0] === date
        ).length || 0;
        return {
          date: new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          count,
        };
      });

      return { total, published, drafts, byPriority, recentActivity };
    },
    enabled: canView,
  });

  if (!canView) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">You don't have permission to view analytics.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">Failed to load analytics.</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = {
    urgent: '#ef4444',
    high: '#f97316',
    normal: '#3b82f6',
    low: '#6b7280',
  };

  const priorityData = Object.entries(stats.byPriority).map(([priority, count]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: count,
    fill: COLORS[priority as keyof typeof COLORS],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-blue-100">
          <TrendingUp className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcements Analytics</h2>
          <p className="text-sm text-gray-500">Track announcement engagement and statistics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Announcements */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Announcements</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Published */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Published</p>
                <p className="text-3xl font-bold text-green-600">{stats.published}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Drafts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Drafts</p>
                <p className="text-3xl font-bold text-orange-600">{stats.drafts}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Publication Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.total === 0 ? '0' : Math.round((stats.published / stats.total) * 100)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Announcements by Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    className={cn(
                      'border',
                      priority === 'urgent' && 'bg-red-100 text-red-800 border-red-300',
                      priority === 'high' && 'bg-orange-100 text-orange-800 border-orange-300',
                      priority === 'normal' && 'bg-blue-100 text-blue-800 border-blue-300',
                      priority === 'low' && 'bg-gray-100 text-gray-800 border-gray-300'
                    )}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Badge>
                  <span className="text-gray-700 font-medium">{count} announcements</span>
                </div>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full',
                      priority === 'urgent' && 'bg-red-500',
                      priority === 'high' && 'bg-orange-500',
                      priority === 'normal' && 'bg-blue-500',
                      priority === 'low' && 'bg-gray-500'
                    )}
                    style={{
                      width: `${stats.total === 0 ? 0 : (count / stats.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default AnnouncementsAnalytics;
