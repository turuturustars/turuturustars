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
  PieChart,
  Download,
  DollarSign,
} from 'lucide-react';

const TreasurerRole = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { status: statusMessage, showSuccess } = useStatus();
  const userRoles = roles.map(r => r.role);
  const isTreasurer = hasRole(userRoles, 'treasurer');

  const quickActions = [
    {
      title: 'Payment Tracking',
      description: 'View M-Pesa transactions',
      icon: <DollarSign className="w-5 h-5" />,
      path: '/dashboard/finance/mpesa',
      color: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Financial Reports',
      description: 'View and export reports',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/dashboard/finance/reports',
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Contributions',
      description: 'View all member contributions',
      icon: <TrendingUp className="w-5 h-5" />,
      path: '/dashboard/finance/all-contributions',
      color: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Export Data',
      description: 'Download financial statements',
      icon: <Download className="w-5 h-5" />,
      path: '/dashboard/finance/reports',
      color: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold">Treasurer Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage financial records and payment tracking
        </p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES --</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES --</div>
            <p className="text-xs text-muted-foreground mt-1">Collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
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
            <span>Receive and disburse funds as authorized</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Maintain accurate books of accounts</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Track all vouchers, cheques, and banking slips</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5">•</Badge>
            <span>Prepare financial reports and statements for approval</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreasurerRole;

