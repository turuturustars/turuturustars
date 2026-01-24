import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole } from '@/lib/rolePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  AlertTriangle,
  Gavel,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
} from 'lucide-react';

const OrganizingSecretaryDashboard = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { status: statusMessage, showSuccess } = useStatus();
  const userRoles = roles.map(r => r.role);
  const isOrgSecretary = hasRole(userRoles, 'organizing_secretary');

  const quickActions = [
    {
      title: 'Manage Meetings',
      description: 'Organize venues & schedule meetings',
      icon: <Calendar className="w-5 h-5" />,
      path: '/dashboard/meetings',
      color: 'bg-blue-100 dark:bg-blue-900/30',
      responsibility: 'a) Organize venue of meetings and b) Ensure meeting items are available',
    },
    {
      title: 'Record Misconduct',
      description: 'Document discipline incidents',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/discipline',
      color: 'bg-red-100 dark:bg-red-900/30',
      responsibility: 'c) Keep records of any misconduct',
    },
    {
      title: 'Manage Fines',
      description: 'Track and collect penalties',
      icon: <DollarSign className="w-5 h-5" />,
      path: '/dashboard/discipline',
      color: 'bg-orange-100 dark:bg-orange-900/30',
      responsibility: 'd) Collect fines and penalties',
    },
    {
      title: 'Discipline Records',
      description: 'View all incident reports',
      icon: <Gavel className="w-5 h-5" />,
      path: '/dashboard/discipline',
      color: 'bg-purple-100 dark:bg-purple-900/30',
      responsibility: 'Be the discipline master',
    },
    {
      title: 'Member Registry',
      description: 'View member information',
      icon: <Users className="w-5 h-5" />,
      path: '/dashboard/members',
      color: 'bg-green-100 dark:bg-green-900/30',
      responsibility: 'Reference for member records',
    },
    {
      title: 'Reports',
      description: 'View fines & incident reports',
      icon: <CheckCircle className="w-5 h-5" />,
      path: '/dashboard/reports',
      color: 'bg-cyan-100 dark:bg-cyan-900/30',
      responsibility: 'Generate reports on disciplinary actions',
    },
  ];

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Organizing Secretary / Discipline Master</h1>
        <p className="text-muted-foreground mt-1">
          Manage meetings, venues, discipline, and fines
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Pending resolution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fines Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Pending collection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Key Responsibilities & Functions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <CardDescription>Article 11.7 – Organizing Secretary / Discipline Master</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">a)</Badge>
            <span>Organize venue of meetings</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">b)</Badge>
            <span>Make sure that items required during meetings are availed</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">c)</Badge>
            <span>Keep records of any misconduct</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">d)</Badge>
            <span>Collect fines and penalties as authorized</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">e)</Badge>
            <span>Perform any other duty as may be directed by the chairman</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">f)</Badge>
            <span>Be the discipline master - enforce discipline according to constitution</span>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Preparation Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Preparation Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Venue booked and confirmed</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Meeting materials prepared (agenda, documents)</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Attendance sheet and sign-in ready</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Minutes recording equipment available</span>
          </div>
          <div className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-accent/50">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Disciplinary notices issued (if needed)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizingSecretaryDashboard;
