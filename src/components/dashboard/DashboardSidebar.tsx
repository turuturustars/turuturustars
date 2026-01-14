import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  HandHeart, 
  DollarSign, 
  Bell, 
  Settings,
  LogOut,
  Star,
  FileText,
  UserCheck,
  TrendingUp,
  PiggyBank,
  ClipboardList,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { getPrimaryRole, hasRole } from '@/lib/rolePermissions';

const DashboardSidebar = () => {
  const location = useLocation();
  const { profile, roles, isOfficial, signOut, isLoading } = useAuth();
  const userRoles = roles.map(r => r.role);
  const primaryRole = getPrimaryRole(userRoles);
  const isUserOfficial = userRoles.some(r => ['admin', 'treasurer', 'secretary', 'chairperson', 'vice_chairperson', 'vice_secretary', 'organizing_secretary', 'committee_member', 'patron'].includes(r));

  const memberLinks = [
    { label: 'Dashboard', href: '/dashboard/home', icon: LayoutDashboard },
    { label: 'My Contributions', href: '/dashboard/contributions', icon: DollarSign },
    { label: 'Welfare Cases', href: '/dashboard/welfare', icon: HandHeart },
    { label: 'Announcements', href: '/dashboard/announcements', icon: Bell },
    { label: 'My Profile', href: '/dashboard/profile', icon: Settings },
  ];

  // Role-specific navigation
  const roleSpecificLinks = () => {
    if (hasRole(userRoles, 'chairperson')) {
      return [
        { label: 'Chair Dashboard', href: `/dashboard/chairperson`, icon: Star },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Meetings', href: '/dashboard/meetings', icon: FileText },
        { label: 'Announcements', href: '/dashboard/announcements', icon: Bell },
      ];
    }
    if (hasRole(userRoles, 'vice_chairperson')) {
      return [
        { label: 'Vice Chairman', href: `/dashboard/vice-chairperson`, icon: Star },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Meetings', href: '/dashboard/meetings', icon: FileText },
        { label: 'Announcements', href: '/dashboard/announcements', icon: Bell },
        { label: 'Community', href: '/dashboard/community', icon: HandHeart },
        { label: 'Reports', href: '/dashboard/reports', icon: TrendingUp },
        { label: 'Discipline', href: '/dashboard/discipline', icon: FileText },
      ];
    }
    if (hasRole(userRoles, 'secretary') || hasRole(userRoles, 'vice_secretary')) {
      return [
        { label: 'Secretary', href: `/dashboard/secretary-role`, icon: FileText },
        { label: 'Records', href: '/dashboard/secretary', icon: ClipboardList },
      ];
    }
    if (hasRole(userRoles, 'treasurer')) {
      return [
        { label: 'Treasury', href: `/dashboard/treasurer-role`, icon: PiggyBank },
        { label: 'Payments', href: '/dashboard/mpesa-management', icon: Smartphone },
        { label: 'Reports', href: '/dashboard/reports', icon: TrendingUp },
      ];
    }
    if (hasRole(userRoles, 'organizing_secretary')) {
      return [
        { label: 'Org Secretary', href: `/dashboard/organizing-secretary`, icon: ClipboardList },
        { label: 'Meetings', href: '/dashboard/meetings', icon: FileText },
        { label: 'Discipline & Fines', href: '/dashboard/discipline', icon: FileText },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Reports', href: '/dashboard/reports', icon: TrendingUp },
      ];
    }
    if (hasRole(userRoles, 'patron')) {
      return [
        { label: 'Patron Dashboard', href: `/dashboard/patron`, icon: Star },
        { label: 'Reports', href: '/dashboard/reports', icon: FileText },
      ];
    }
    if (hasRole(userRoles, 'admin')) {
      return [
        { label: 'Admin Dashboard', href: `/dashboard/admin`, icon: Settings },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Payments', href: '/dashboard/mpesa-management', icon: Smartphone },
        { label: 'Reports', href: '/dashboard/reports', icon: FileText },
        { label: 'Approvals', href: '/dashboard/approvals', icon: UserCheck },
      ];
    }
    return [];
  };

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Star className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-serif font-semibold text-foreground">Turuturu Stars</span>
            <span className="block text-xs text-muted-foreground">Member Portal</span>
          </div>
        </Link>
      </div>

      {/* Member Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <span className="text-sm font-medium text-accent-foreground">
              {profile?.full_name?.charAt(0) || 'M'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || 'Member'}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile?.membership_number || 'Pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Member
        </p>
        {memberLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}

        {isUserOfficial && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-3">
              {primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1).replace('_', ' ')}
            </p>
            {roleSpecificLinks().map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;