import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, normalizeRoles } from '@/lib/rolePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  FileText,
  Archive,
  Users,
  Bell,
  MessageSquare,
} from 'lucide-react';

const SecretaryDashboard = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { status: statusMessage, showSuccess } = useStatus();
  const userRoles = normalizeRoles(roles);
  const isSecretary = hasRole(userRoles, 'secretary') || hasRole(userRoles, 'vice_secretary');

  const quickActions = [
    {
      title: 'Meeting Notices',
      description: 'Issue notices and invitations',
      icon: <Mail className="w-5 h-5" />,
      path: '/dashboard/governance/secretary-dashboard',
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Record Minutes',
      description: 'Upload and archive meeting minutes',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/governance/secretary-dashboard',
      color: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Correspondence',
      description: 'Manage official communications',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/dashboard/governance/secretary-dashboard',
      color: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Records Archive',
      description: 'View and search archived records',
      icon: <Archive className="w-5 h-5" />,
      path: '/dashboard/governance/secretary-dashboard',
      color: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Secretary Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage correspondence, records, and meeting notices
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">To be issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Archived Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Stored records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Pending responses</p>
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
            <span>Handle all official correspondence and communications</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Issue notices for meetings and important announcements</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Record, store, and preserve meeting minutes</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Maintain searchable archive of all association records</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecretaryDashboard;

