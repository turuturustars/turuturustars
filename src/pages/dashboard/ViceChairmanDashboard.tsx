import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole } from '@/lib/rolePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Bell,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Calendar,
  Award,
} from 'lucide-react';

const ViceChairmanDashboard = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const userRoles = roles.map(r => r.role);

  const quickActions = [
    {
      title: 'Convene Meetings',
      description: 'Schedule association & committee meetings',
      icon: <Calendar className="w-5 h-5" />,
      path: '/dashboard/meetings',
      color: 'bg-blue-100 dark:bg-blue-900/30',
      responsibility: 'Convene and preside over meetings in chairman\'s absence',
    },
    {
      title: 'Preside Meetings',
      description: 'Chair association meetings & AGM',
      icon: <Award className="w-5 h-5" />,
      path: '/dashboard/meetings',
      color: 'bg-amber-100 dark:bg-amber-900/30',
      responsibility: 'Preside over all meetings of the association',
    },
    {
      title: 'Send Announcements',
      description: 'Broadcast messages to members',
      icon: <Bell className="w-5 h-5" />,
      path: '/dashboard/announcements',
      color: 'bg-purple-100 dark:bg-purple-900/30',
      responsibility: 'Communicate with membership',
    },
    {
      title: 'Member Registry',
      description: 'View and manage members',
      icon: <Users className="w-5 h-5" />,
      path: '/dashboard/members',
      color: 'bg-green-100 dark:bg-green-900/30',
      responsibility: 'Oversee membership administration',
    },
    {
      title: 'Community Management',
      description: 'Manage associations and partnerships',
      icon: <TrendingUp className="w-5 h-5" />,
      path: '/dashboard/community',
      color: 'bg-cyan-100 dark:bg-cyan-900/30',
      responsibility: 'Lead community initiatives',
    },
    {
      title: 'Reports & Voting',
      description: 'Review reports and manage voting',
      icon: <CheckCircle className="w-5 h-5" />,
      path: '/dashboard/reports',
      color: 'bg-pink-100 dark:bg-pink-900/30',
      responsibility: 'Approve reports and manage voting',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Vice Chairman</h1>
        <p className="text-muted-foreground mt-1">
          Perform chairman duties in absence. Manage meetings, announcements, and the association.
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
        <h2 className="text-xl font-semibold mb-4">Key Responsibilities & Functions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
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
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground italic">{action.responsibility}</p>
                  </div>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* Constitutional Responsibilities */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle>Constitutional Responsibilities</CardTitle>
          <CardDescription>Article 11.3 – Vice Chairman</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Primary Responsibility:</p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Perform the duties of the chairman in his/her absence
            </p>
          </div>

          <div>
            <p className="font-semibold mb-3">When Acting as Chairman, You Shall:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">a)</Badge>
                <span>Convene and preside over all meetings of the Association</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">b)</Badge>
                <span>Convene and preside over all meetings of the management committee</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">c)</Badge>
                <span>Convene and preside over all the annual general meetings</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">d)</Badge>
                <span>Convene and preside over all special meetings</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">e)</Badge>
                <span>Keep the official Registration Certificate (when authorized by chairman)</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mt-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Note:</span> As Vice Chairman, you have the same authority as the Chairman when required to act in their absence. This includes full access to all chairman-level functions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Responsibilities Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Responsibilities Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Convene meetings as required by constitution</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Preside over all meetings when in session</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Maintain order and enforce constitution</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Guide decision-making and voting</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Communicate with all members</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Oversee member management and approvals</span>
          </div>
        </CardContent>
      </Card>

      {/* Authority Notes */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Authority Delegation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-semibold">Equal Authority:</span> When the Chairman is absent, you exercise full Chairman authority.
          </p>
          <p>
            <span className="font-semibold">Registration Certificate:</span> You may retain the official Registration Certificate when authorized by the Chairman or when performing chairman duties.
          </p>
          <p>
            <span className="font-semibold">Acting Chairman:</span> Your decisions and actions as Acting Chairman carry the same weight as those of the Chairman.
          </p>
          <p>
            <span className="font-semibold">Succession:</span> In case of both Chairman and Vice Chairman absence, the Secretary assumes leadership.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViceChairmanDashboard;
