import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole } from '@/lib/rolePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
} from 'lucide-react';

const PatronDashboard = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { status: statusMessage, showSuccess } = useStatus();
  const userRoles = roles.map(r => r.role);
  const isPatron = hasRole(userRoles, 'patron');

  const quickActions = [
    {
      title: 'Association Reports',
      description: 'View key metrics and reports',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/dashboard/reports',
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Member Statistics',
      description: 'Overview of membership',
      icon: <Users className="w-5 h-5" />,
      path: '/dashboard/members',
      color: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Key Insights',
      description: 'Association performance',
      icon: <TrendingUp className="w-5 h-5" />,
      path: '/dashboard/reports',
      color: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Announcements',
      description: 'Stay informed',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/announcements',
      color: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Patron Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Oversee association progress and performance
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-- %</div>
            <p className="text-xs text-muted-foreground mt-1">This year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Partnerships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Active networks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-- %</div>
            <p className="text-xs text-muted-foreground mt-1">Member feedback</p>
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
              aria-label={`Navigate to ${action.title}`}
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
            <span>Oversee overall wellbeing of the Association</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Facilitate networking and partnerships</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Provide strategic guidance and mentorship</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Maintain communication with Management Committee</span>
          </div>
        </CardContent>
      </Card>

      {/* Message to Management Committee */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle>Direct Communication</CardTitle>
          <CardDescription>Reach out to the Management Committee</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => navigate('/dashboard/chat')}
            aria-label="Open private chat with management committee"
            className="text-primary hover:underline text-sm"
          >
            Open Private Chat with MC →
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatronDashboard;
