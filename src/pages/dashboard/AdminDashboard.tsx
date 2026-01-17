import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Users,
  Settings,
  BarChart3,
  Shield,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  MessageSquare,
  Calendar,
  DollarSign,
  Gavel,
  Mail,
  Bell,
  Eye,
  Database,
  Sparkles,
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    upcomingMeetings: 0,
    pendingApprovals: 0,
    publishedAnnouncements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard statistics
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total members
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active members (status = 'active')
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get upcoming meetings (status = 'scheduled')
      const { data: upcomingData } = await supabase
        .from('meetings')
        .select('*')
        .eq('status', 'scheduled')
        .gt('scheduled_date', new Date().toISOString());

      // Get pending approvals (using profiles with pending status)
      const { count: approvalsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get published announcements
      const { count: announcementsCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('published', true);

      setStats({
        totalMembers: totalCount || 0,
        activeMembers: activeCount || 0,
        upcomingMeetings: upcomingData?.length || 0,
        pendingApprovals: approvalsCount || 0,
        publishedAnnouncements: announcementsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Members',
      value: stats.totalMembers,
      change: '',
      trend: 'neutral',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      description: 'All registered members',
    },
    {
      title: 'Active Members',
      value: stats.activeMembers,
      change: '',
      trend: 'neutral',
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/50',
      description: 'Members with active roles',
    },
    {
      title: 'Upcoming Meetings',
      value: stats.upcomingMeetings,
      change: 'Scheduled',
      trend: 'neutral',
      icon: Calendar,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
      description: 'Future meetings',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      change: 'Applications',
      trend: 'neutral',
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
      description: 'Awaiting review',
    },
    {
      title: 'Published Announcements',
      value: stats.publishedAnnouncements,
      change: '',
      trend: 'neutral',
      icon: Bell,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-950/50',
      description: 'Active announcements',
    },
  ];

  const sections = [
    {
      title: 'User Management',
      description: 'Manage roles, permissions, and member access',
      icon: Users,
      items: [
        { label: 'All Members', path: '/dashboard/members', icon: Users, badge: '156' },
        { label: 'Role Management', path: '/dashboard/roles', icon: Shield, badge: null },
        { label: 'Pending Approvals', path: '/dashboard/approvals', icon: CheckCircle2, badge: '3' },
      ],
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50',
    },
    {
      title: 'Financial Management',
      description: 'Oversee all payments, transactions, and finances',
      icon: DollarSign,
      items: [
        { label: 'Payment Tracking', path: '/dashboard/mpesa-management', icon: DollarSign, badge: null },
        { label: 'Financial Reports', path: '/dashboard/reports', icon: BarChart3, badge: null },
        { label: 'All Contributions', path: '/dashboard/all-contributions', icon: TrendingUp, badge: 'KES 2.4M' },
      ],
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50',
    },
    {
      title: 'Operations & Records',
      description: 'Manage meetings, discipline cases, and documentation',
      icon: Settings,
      items: [
        { label: 'Meetings', path: '/dashboard/meetings', icon: Calendar, badge: '2 upcoming' },
        { label: 'Discipline Cases', path: '/dashboard/discipline', icon: Gavel, badge: '1 active' },
        { label: 'Secretary Tasks', path: '/dashboard/secretary', icon: Mail, badge: null },
      ],
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50',
    },
    {
      title: 'Communications Hub',
      description: 'Send announcements and manage all communications',
      icon: MessageSquare,
      items: [
        { label: 'Announcements', path: '/dashboard/announcements', icon: Bell, badge: null },
        { label: 'Direct Messages', path: '/dashboard/chat', icon: MessageSquare, badge: '12' },
        { label: 'Notifications Center', path: '/dashboard/notifications', icon: Bell, badge: '45' },
      ],
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50',
    },
  ];

  const permissions = [
    { text: 'Full access to all association systems', icon: Database },
    { text: 'Manage user roles and permissions', icon: Shield },
    { text: 'View all financial and membership data', icon: Eye },
    { text: 'System configuration and settings', icon: Settings },
    { text: 'Audit logs and activity tracking', icon: Activity },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-pink-600 p-8 sm:p-10 shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
              Administrator
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-white/90 text-base sm:text-lg max-w-2xl">
            Complete system oversight and control. Manage all aspects of the organization.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const isUp = stat.trend === 'up';
          const isDown = stat.trend === 'down';
          
          return (
            <Card key={idx} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2.5 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-foreground">
                  {isLoading ? (
                    <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                  {stat.change && (
                    <div className={`text-xs font-medium text-muted-foreground`}>
                      {stat.change}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Management Sections */}
      <div className="space-y-8">
        {sections.map((section, idx) => {
          const SectionIcon = section.icon;
          
          return (
            <div key={idx} className="space-y-4">
              {/* Section Header */}
              <div className="flex items-start gap-4">
                <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${section.bgGradient} border-2 border-white dark:border-gray-800 shadow-lg`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-10 rounded-2xl`} />
                  <SectionIcon className={`w-6 h-6 relative z-10 bg-gradient-to-br ${section.gradient} bg-clip-text text-transparent`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                    {section.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </div>
              </div>

              {/* Section Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item, itemIdx) => {
                  const ItemIcon = item.icon;
                  
                  return (
                    <Card
                      key={itemIdx}
                      onClick={() => navigate(item.path)}
                      className="group cursor-pointer border-2 hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${section.bgGradient} group-hover:scale-110 transition-transform`}>
                            <ItemIcon className="w-4 h-4" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                          {item.label}
                        </h3>
                        {item.badge && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Frequently used administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate('/dashboard/members')}>
              <Users className="w-4 h-4" />
              Add Member
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate('/dashboard/announcements')}>
              <Bell className="w-4 h-4" />
              New Announcement
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate('/dashboard/reports')}>
              <BarChart3 className="w-4 h-4" />
              Generate Report
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate('/dashboard/settings')}>
              <Settings className="w-4 h-4" />
              System Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-purple-50/50 to-primary/5 dark:from-primary/10 dark:via-purple-950/50 dark:to-primary/10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            Administrator Permissions & Access
          </CardTitle>
          <CardDescription>
            You have unrestricted access to all system functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {permissions.map((permission, idx) => {
              const PermIcon = permission.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/80 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-colors"
                >
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <PermIcon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {permission.text}
                   </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;