import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessibleButton, AccessibleStatus, useStatus } from '@/components/accessible';
import { useAuth } from '@/hooks/useAuth';
import {
  Crown,
  Users,
  FileText,
  DollarSign,
  Briefcase,
  Shield,
  Star,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface Role {
  id: string;
  title: string;
  path: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const RolesPage = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { status, showSuccess } = useStatus();

  const availableRoles: Role[] = [
    {
      id: 'chairperson',
      title: 'Chairperson',
      path: '/dashboard/roles/chairperson',
      description: 'Overall organization leadership and decision-making',
      icon: <Crown className="w-8 h-8" />,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      id: 'vice-chairperson',
      title: 'Vice Chairperson',
      path: '/dashboard/roles/vice-chairperson',
      description: 'Support chairperson and deputize when needed',
      icon: <Star className="w-8 h-8" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      id: 'secretary',
      title: 'Secretary',
      path: '/dashboard/roles/secretary',
      description: 'Documentation, correspondence, and record keeping',
      icon: <FileText className="w-8 h-8" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/50',
    },
    {
      id: 'treasurer',
      title: 'Treasurer',
      path: '/dashboard/roles/treasurer',
      description: 'Financial management and fund administration',
      icon: <DollarSign className="w-8 h-8" />,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      id: 'organizing-secretary',
      title: 'Organizing Secretary',
      path: '/dashboard/roles/organizing-secretary',
      description: 'Event planning and organizational coordination',
      icon: <Briefcase className="w-8 h-8" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
      id: 'patron',
      title: 'Patron',
      path: '/dashboard/roles/patron',
      description: 'Advisory and mentorship role',
      icon: <Shield className="w-8 h-8" />,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      id: 'admin',
      title: 'Administrator',
      path: '/dashboard/roles/admin',
      description: 'System administration and oversight',
      icon: <Users className="w-8 h-8" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/50',
    },
  ];

  const handleRoleNavigation = (role: Role) => {
    if (roles.includes(role.id) || roles.includes('admin')) {
      navigate(role.path);
      showSuccess(`Navigating to ${role.title} dashboard`);
    }
  };

  return (
    <div className="space-y-6">
      <AccessibleStatus />
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Role Dashboards</h1>
        <p className="text-muted-foreground">
          Select a role to view its specific dashboard and management tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableRoles.map((role) => {
          const hasAccess = roles.includes(role.id) || roles.includes('admin');

          return (
            <Card
              key={role.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                hasAccess
                  ? 'hover:shadow-lg cursor-pointer hover:border-primary/50'
                  : 'opacity-60'
              }`}
            >
              <CardHeader className={`pb-4 ${role.bgColor}`}>
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${role.bgColor} ${role.color}`}>
                    {role.icon}
                  </div>
                  {!hasAccess && (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="mt-4 text-xl">{role.title}</CardTitle>
                <CardDescription className="text-sm">
                  {role.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4">
                {hasAccess ? (
                  <AccessibleButton
                    onClick={() => handleRoleNavigation(role)}
                    className="w-full btn-primary group"
                    ariaLabel={`Go to ${role.title} dashboard`}
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </AccessibleButton>
                ) : (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    You don't have access to this role
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {roles.length === 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  No Roles Assigned
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Contact an administrator to assign a role to your account
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RolesPage;
