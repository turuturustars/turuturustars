import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, isManagementCommittee } from '@/lib/rolePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  Settings,
  BarChart3,
  Bell,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

const ChairpersonDashboard = () => {
  const navigate = useNavigate();
  const { roles, profile } = useAuth();
  const userRoles = roles.map(r => r.role);
  const isChair = hasRole(userRoles, 'chairperson') || hasRole(userRoles, 'vice_chairperson');

  const quickActions = [
    {
      title: 'Create Meeting',
      description: 'Schedule a meeting or AGM',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/meetings',
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Send Announcement',
      description: 'Broadcast to all members',
      icon: <Bell className="w-5 h-5" />,
      path: '/dashboard/announcements',
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
      title: 'Community',
      description: 'Manage associations',
      icon: <TrendingUp className="w-5 h-5" />,
      path: '/dashboard/community',
      color: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Chairperson Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage meetings, announcements, and the association
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Member applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Published</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
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
