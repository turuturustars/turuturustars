import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, normalizeRoles } from '@/lib/rolePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  Bell,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

const ChairpersonDashboard = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { status: statusMessage } = useStatus();
  const userRoles = normalizeRoles(roles);
  
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingMeetings: 0,
    pendingApprovals: 0,
    announcements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch statistics
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total members
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get upcoming meetings
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
        upcomingMeetings: upcomingData?.length || 0,
        pendingApprovals: approvalsCount || 0,
        announcements: announcementsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create Meeting',
      description: 'Schedule a meeting or AGM',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/governance/meetings',
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Send Announcement',
      description: 'Broadcast to all members',
      icon: <Bell className="w-5 h-5" />,
      path: '/dashboard/communication/announcements',
      color: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Member Registry',
      description: 'View and manage members',
      icon: <Users className="w-5 h-5" />,
      path: '/dashboard/members',
      color: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Reports',
      description: 'View financial and member reports',
      icon: <TrendingUp className="w-5 h-5" />,
      path: '/dashboard/finance/reports',
      color: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Chairperson Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage meetings, announcements, and the association
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border-2 hover:shadow-lg transition-all hover:border-blue-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Members</CardTitle>
              <Users className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">{isLoading ? '--' : stats.totalMembers}</div>
            <p className="text-xs sm:text-xs text-muted-foreground mt-2">Active & registered members</p>
            <AccessibleButton variant="outline" className="mt-3 w-full text-xs" ariaLabel="View all members" asChild>
              <a href="/dashboard/members">View All</a>
            </AccessibleButton>
          </CardContent>
        </Card>
        <Card className="border-2 hover:shadow-lg transition-all hover:border-amber-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">Upcoming Meetings</CardTitle>
              <FileText className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">{isLoading ? '--' : stats.upcomingMeetings}</div>
            <p className="text-xs sm:text-xs text-muted-foreground mt-2">Scheduled events</p>
            <AccessibleButton variant="outline" className="mt-3 w-full text-xs" ariaLabel="Schedule a new meeting" asChild>
              <a href="/dashboard/governance/meetings">Schedule</a>
            </AccessibleButton>
          </CardContent>
        </Card>
        <Card className="border-2 hover:shadow-lg transition-all hover:border-purple-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">Pending Approvals</CardTitle>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">{isLoading ? '--' : stats.pendingApprovals}</div>
            <p className="text-xs sm:text-xs text-muted-foreground mt-2">Awaiting review</p>
            <AccessibleButton variant="outline" className="mt-3 w-full text-xs" ariaLabel="Review pending approvals" asChild>
              <a href="/dashboard/admin-panel/approvals">Review</a>
            </AccessibleButton>
          </CardContent>
        </Card>
        <Card className="border-2 hover:shadow-lg transition-all hover:border-pink-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">Announcements</CardTitle>
              <Bell className="w-4 h-4 flex-shrink-0 text-pink-600 dark:text-pink-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">{isLoading ? '--' : stats.announcements}</div>
            <p className="text-xs sm:text-xs text-muted-foreground mt-2">Published announcements</p>
            <AccessibleButton variant="outline" className="mt-3 w-full text-xs" ariaLabel="Create announcement" asChild>
              <a href="/dashboard/communication/announcements">Create</a>
            </AccessibleButton>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {quickActions.map((action, idx) => (
            <button
              key={String(idx)}
              onClick={() => navigate(action.path)}
              className="group"
            >
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center text-foreground mb-3 group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription className="text-sm">{action.description}</CardDescription>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* Key Responsibilities */}
      <Card>
        <CardHeader>
          <CardTitle>Key Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Convene and preside over association meetings and AGM</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Safely keep the official Registration Certificate</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Broadcast announcements and direct communication</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Approve key decisions and ensure constitution adherence</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChairpersonDashboard;

