import { useState, useEffect } from 'react';
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
  ChevronDown,
  Menu,
  X,
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
  
  const [isOpen, setIsOpen] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setIsOpen(true);
  }, [isMobile]);

  const toggleRoleSection = () => {
    setExpandedRole(expandedRole ? null : primaryRole);
  };

  const memberLinks = [
    { label: 'Dashboard', href: '/dashboard/home', icon: LayoutDashboard, badge: null },
    { label: 'My Contributions', href: '/dashboard/contributions', icon: DollarSign, badge: null },
    { label: 'Welfare Cases', href: '/dashboard/welfare', icon: HandHeart, badge: null },
    { label: 'Announcements', href: '/dashboard/announcements', icon: Bell, badge: 'new' },
    { label: 'My Profile', href: '/dashboard/profile', icon: Settings, badge: null },
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
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground md:hidden hover:bg-primary/90 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Backdrop for Mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:relative z-40 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out',
          isMobile && !isOpen && '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="p-4 md:p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <Link
            to="/"
            className="flex items-center gap-3 group"
            onClick={() => isMobile && setIsOpen(false)}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Star className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-serif font-bold text-foreground text-base group-hover:text-primary transition-colors">Turuturu Stars</span>
              <span className="block text-xs text-muted-foreground">Member Portal</span>
            </div>
          </Link>
        </div>

        {/* Member Info Card */}
        <div className="p-4 border-b border-border mx-3 my-3 rounded-lg bg-gradient-to-br from-accent/50 to-accent/20 backdrop-blur-sm hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-sm font-bold text-primary-foreground">
                {profile?.full_name?.charAt(0) || 'M'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate hover:text-clip">
                {profile?.full_name || 'Member'}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.membership_number || 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 scrollbar-hide">
          {/* Member Section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">
              Menu
            </p>
            <div className="space-y-1">
              {memberLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => isMobile && setIsOpen(false)}
                    className={cn(
                      'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{link.label}</span>
                    </div>
                    {link.badge && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                        1
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Role-Specific Section */}
          {isUserOfficial && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <button
                onClick={toggleRoleSection}
                className="w-full flex items-center justify-between px-3 py-2.5 mb-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors hover:bg-accent/30"
              >
                <span>{primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1).replace('_', ' ')}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    expandedRole && 'rotate-180'
                  )}
                />
              </button>
              {expandedRole && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  {roleSpecificLinks().map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => isMobile && setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Logout Section */}
        <div className="p-3 md:p-4 border-t border-border bg-gradient-to-t from-background/50 to-transparent">
          <Button
            onClick={signOut}
            disabled={isLoading}
            className={cn(
              'w-full justify-start gap-3 font-medium transition-all duration-200',
              'bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive'
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {isMobile ? 'Sign Out' : 'Sign Out'}
          </Button>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;