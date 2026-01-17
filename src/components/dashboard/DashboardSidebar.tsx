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
  X,
  Menu,
  MessageCircle,
  Vote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { getPrimaryRole, hasRole } from '@/lib/rolePermissions';

interface DashboardSidebarProps {
  onClose?: () => void;
}

const DashboardSidebar = ({ onClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const { profile, roles, isOfficial, signOut, isLoading } = useAuth();
  const userRoles = roles.map(r => r.role);
  const primaryRole = getPrimaryRole(userRoles);
  const isUserOfficial = userRoles.some(r => ['admin', 'treasurer', 'secretary', 'chairperson', 'vice_chairperson', 'vice_secretary', 'organizing_secretary', 'committee_member', 'patron'].includes(r));
  
  const [expandedRole, setExpandedRole] = useState<string | null>(primaryRole);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleRoleSection = () => {
    setExpandedRole(expandedRole ? null : primaryRole);
  };

  const memberLinks = [
    { label: 'Dashboard', href: '/dashboard/home', icon: LayoutDashboard, badge: null },
    { label: 'Contributions', href: '/dashboard/contributions', icon: DollarSign, badge: null },
    { label: 'Welfare Cases', href: '/dashboard/welfare', icon: HandHeart, badge: null },
    { label: 'Announcements', href: '/dashboard/announcements', icon: Bell, badge: 'new' },
    { label: 'Voting', href: '/dashboard/voting', icon: Vote, badge: null },
    { label: 'Private Messages', href: '/dashboard/communication/messages', icon: MessageCircle, badge: null },
    { label: 'Profile', href: '/dashboard/profile', icon: Settings, badge: null },
  ];

  const roleSpecificLinks = () => {
    if (hasRole(userRoles, 'chairperson')) {
      return [
        { label: 'Chair Dashboard', href: `/dashboard/chairperson`, icon: Star },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Welfare Management', href: '/dashboard/members/welfare-management', icon: HandHeart },
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
        { label: 'Welfare Management', href: '/dashboard/members/welfare-management', icon: HandHeart },
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
        { label: 'Welfare Management', href: '/dashboard/members/welfare-management', icon: HandHeart },
        { label: 'Payments', href: '/dashboard/mpesa-management', icon: Smartphone },
        { label: 'Reports', href: '/dashboard/reports', icon: FileText },
        { label: 'Approvals', href: '/dashboard/approvals', icon: UserCheck },
      ];
    }
    return [];
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside
      className={cn(
        'h-screen w-72 max-w-[85vw] bg-gradient-to-b from-card via-card to-card/95',
        'border-r border-border/40 backdrop-blur-xl',
        'flex flex-col overflow-hidden',
        'shadow-xl lg:shadow-none'
      )}
    >
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Star className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Turuturu Stars
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent/80 rounded-xl transition-all duration-200 active:scale-95 hover:shadow-md"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Logo */}
      <div className="hidden lg:block p-6 border-b border-border/30">
        <Link
          to="/"
          className="flex items-center gap-3 group"
          onClick={handleNavClick}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-serif font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all duration-300">
              Turuturu Stars
            </span>
            <span className="block text-xs text-muted-foreground font-medium">Member Portal</span>
          </div>
        </Link>
      </div>

      {/* Member Info Card */}
      <div className="p-4 mx-4 my-4">
        <div className="relative group overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent group-hover:from-primary/15 group-hover:via-primary/10 transition-all duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/5 to-transparent" />
          
          <div className="relative p-4 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-md" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-lg ring-2 ring-background/50">
                <span className="text-base font-bold text-primary-foreground">
                  {profile?.full_name?.charAt(0) || 'M'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate mb-0.5">
                {profile?.full_name || 'Member'}
              </p>
              <p className="text-xs text-muted-foreground truncate font-medium">
                {profile?.membership_number || 'Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Member Section */}
        <div>
          <div className="px-4 py-2 mb-2">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              Navigation
            </p>
          </div>
          
          <div className="space-y-1">
            {memberLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={handleNavClick}
                  className={cn(
                    'group relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    'hover:translate-x-1 active:scale-[0.98]',
                    isActive
                      ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl" />
                  )}
                  
                  <div className="relative flex items-center gap-3 flex-1 min-w-0">
                    <Icon className={cn(
                      "w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200",
                      isActive ? "scale-110" : "group-hover:scale-110"
                    )} />
                    <span className="truncate">{link.label}</span>
                  </div>
                  
                  {link.badge && (
                    <span className="relative flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground shadow-md">
                      1
                      <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Role-Specific Section */}
        {isUserOfficial && (
          <div className="mt-6 pt-4 border-t border-border/30">
            <button
              onClick={toggleRoleSection}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 mb-2 rounded-xl',
                'text-xs font-bold uppercase tracking-wider transition-all duration-200',
                'hover:bg-accent/60 active:scale-[0.98]',
                expandedRole 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              <span className="truncate flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  expandedRole ? "bg-primary" : "bg-muted-foreground/50"
                )} />
                {primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1).replace('_', ' ')}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform duration-300 flex-shrink-0',
                  expandedRole && 'rotate-180'
                )}
              />
            </button>
            
            <div className={cn(
              "grid transition-all duration-300 ease-in-out",
              expandedRole ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="space-y-1 pt-1">
                  {roleSpecificLinks().map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={handleNavClick}
                        className={cn(
                          'group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                          'hover:translate-x-1 active:scale-[0.98]',
                          isActive
                            ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                        )}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl" />
                        )}
                        
                        <Icon className={cn(
                          "w-[18px] h-[18px] flex-shrink-0 relative transition-transform duration-200",
                          isActive ? "scale-110" : "group-hover:scale-110"
                        )} />
                        <span className="truncate relative">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t border-border/30 bg-gradient-to-t from-background/80 via-background/40 to-transparent backdrop-blur-sm">
        <Button
          onClick={signOut}
          disabled={isLoading}
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 font-medium transition-all duration-200 h-11 text-sm rounded-xl',
            'hover:bg-destructive/10 text-destructive hover:text-destructive',
            'active:scale-[0.98] group relative overflow-hidden',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/5 to-destructive/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <LogOut className="w-[18px] h-[18px] flex-shrink-0 relative transition-transform duration-200 group-hover:scale-110" />
          <span className="truncate relative">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;