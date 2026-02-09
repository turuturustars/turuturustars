import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRoles } from '@/lib/rolePermissions';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Bell,
  BarChart3,
  Mail,
  Gavel,
  MessageSquare,
  CreditCard,
} from 'lucide-react';

type AppRole = 'admin' | 'treasurer' | 'secretary' | 'chairperson' | 'vice_chairman' | 'vice_secretary' | 'organizing_secretary' | 'committee_member' | 'patron' | 'coordinator' | 'member';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: AppRole[];
}

const RoleBasedNav = () => {
  const { roles, profile } = useAuth();
  const location = useLocation();
  const userRoles = normalizeRoles(roles) as AppRole[];

  // Define navigation items with role requirements
  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard/home',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      title: 'Members',
      href: '/dashboard/members',
      icon: <Users className="w-4 h-4" />,
      roles: ['chairperson', 'vice_chairman', 'secretary', 'vice_secretary', 'admin'],
    },
    {
      title: 'Payments',
      href: '/dashboard/finance/mpesa',
      icon: <DollarSign className="w-4 h-4" />,
      roles: ['treasurer', 'admin'],
    },
    {
      title: 'Financial Reports',
      href: '/dashboard/finance/reports',
      icon: <BarChart3 className="w-4 h-4" />,
      roles: ['treasurer', 'admin'],
    },
    {
      title: 'Meetings',
      href: '/dashboard/governance/meetings',
      icon: <Calendar className="w-4 h-4" />,
      roles: ['chairperson', 'vice_chairman', 'secretary', 'vice_secretary', 'organizing_secretary', 'admin'],
    },
    {
      title: 'Secretary Tasks',
      href: '/dashboard/governance/secretary-dashboard',
      icon: <Mail className="w-4 h-4" />,
      roles: ['secretary', 'vice_secretary', 'admin'],
    },
    {
      title: 'Announcements',
      href: '/dashboard/communication/announcements',
      icon: <Bell className="w-4 h-4" />,
      roles: ['chairperson', 'vice_chairman', 'admin'],
    },
    {
      title: 'Discipline',
      href: '/dashboard/members/discipline',
      icon: <Gavel className="w-4 h-4" />,
      roles: ['organizing_secretary', 'admin'],
    },
    {
      title: 'Contributions',
      href: '/dashboard/finance/contributions',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      title: 'Community',
      href: '/dashboard/communication/messages',
      icon: <MessageSquare className="w-4 h-4" />,
      roles: ['chairperson', 'vice_chairman', 'committee_member', 'admin'],
    },
    {
      title: 'Approvals',
      href: '/dashboard/admin-panel/approvals',
      icon: <FileText className="w-4 h-4" />,
      roles: ['admin'],
    },
  ];

  // Filter items based on user roles
  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true; // Show if no role restriction
    return item.roles.some(role => userRoles.includes(role));
  });

  return (
    <>
      {/* User Profile Avatar at the top */}
      {profile && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Avatar className="h-14 w-14 shadow-lg">
            <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name || 'Profile'} />
            <AvatarFallback>{profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <div className="font-semibold text-base truncate max-w-[120px]">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground">{profile.membership_number}</div>
          </div>
        </div>
      )}
      <nav className="space-y-1">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              location.pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent'
            )}
          >
            {item.icon}
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

export default RoleBasedNav;
