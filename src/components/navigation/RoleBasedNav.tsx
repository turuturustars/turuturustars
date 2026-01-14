import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, isManagementCommittee } from '@/lib/rolePermissions';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
  Bell,
  Settings,
  BarChart3,
  Mail,
  Gavel,
  MessageSquare,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavItem[];
}

const RoleBasedNav = () => {
  const { roles } = useAuth();
  const location = useLocation();
  const userRoles = roles.map(r => r.role);

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
      roles: ['chairperson', 'vice_chairperson', 'secretary', 'vice_secretary', 'admin'],
    },
    {
      title: 'Payments',
      href: '/dashboard/mpesa-management',
      icon: <DollarSign className="w-4 h-4" />,
      roles: ['treasurer', 'admin'],
    },
    {
      title: 'Financial Reports',
      href: '/dashboard/reports',
      icon: <BarChart3 className="w-4 h-4" />,
      roles: ['treasurer', 'admin'],
    },
    {
      title: 'Meetings',
      href: '/dashboard/meetings',
      icon: <Calendar className="w-4 h-4" />,
      roles: ['chairperson', 'vice_chairperson', 'secretary', 'vice_secretary', 'organizing_secretary', 'admin'],
    },
    {
      title: 'Secretary Tasks',
      href: '/dashboard/secretary',
      icon: <Mail className="w-4 h-4" />,
      roles: ['secretary', 'vice_secretary', 'admin'],
    },
    {
      title: 'Announcements',
      href: '/dashboard/announcements',
      icon: <Bell className="w-4 h-4" />,
      roles: ['chairperson', 'vice_chairperson', 'admin'],
    },
    {
      title: 'Discipline',
      href: '/dashboard/discipline',
      icon: <Gavel className="w-4 h-4" />,
      roles: ['organizing_secretary', 'admin'],
    },
    {
      title: 'Contributions',
      href: '/dashboard/contributions',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      title: 'Community',
      href: '/dashboard/community',
      icon: <MessageSquare className="w-4 h-4" />,
      roles: ['chairperson', 'vice_chairperson', 'committee_member', 'admin'],
    },
    {
      title: 'Approvals',
      href: '/dashboard/approvals',
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
  );
};

export default RoleBasedNav;
