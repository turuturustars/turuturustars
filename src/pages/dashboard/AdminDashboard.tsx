import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Settings,
  BarChart3,
  Sliders,
  Shield,
  Database,
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'User Management',
      description: 'Manage roles, permissions, and access',
      icon: <Users className="w-5 h-5" />,
      items: [
        { label: 'Members', path: '/dashboard/members' },
        { label: 'Role Management', path: '/dashboard/roles' },
        { label: 'Approvals', path: '/dashboard/approvals' },
      ],
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Financial Management',
      description: 'Oversee all payments and finances',
      icon: <BarChart3 className="w-5 h-5" />,
      items: [
        { label: 'Payment Tracking', path: '/dashboard/mpesa-management' },
        { label: 'Reports', path: '/dashboard/reports' },
        { label: 'Contributions', path: '/dashboard/all-contributions' },
      ],
      color: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Operations',
      description: 'Manage meetings, discipline, and records',
      icon: <Settings className="w-5 h-5" />,
      items: [
        { label: 'Meetings', path: '/dashboard/meetings' },
        { label: 'Discipline', path: '/dashboard/discipline' },
        { label: 'Secretary Tasks', path: '/dashboard/secretary' },
      ],
      color: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Communications',
      description: 'Send announcements and manage communications',
      icon: <Shield className="w-5 h-5" />,
      items: [
        { label: 'Announcements', path: '/dashboard/announcements' },
        { label: 'Direct Messages', path: '/dashboard/chat' },
        { label: 'Notifications', path: '/dashboard/notifications' },
      ],
      color: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Administrator Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Full system access and control
        </p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground mt-1">Operational</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Online users</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Sections */}
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center text-foreground`}>
                {section.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-15">
              {section.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={() => navigate(item.path)}
                  className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-colors text-left"
                >
                  <div className="font-medium text-sm">{item.label}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Info */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Administrator Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">✓</Badge>
              <span>Full access to all association systems</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">✓</Badge>
              <span>Manage user roles and permissions</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">✓</Badge>
              <span>View all financial and membership data</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">✓</Badge>
              <span>System configuration and settings</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">✓</Badge>
              <span>Audit logs and activity tracking</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
