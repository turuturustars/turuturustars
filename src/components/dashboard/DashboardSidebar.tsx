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
import turuturuLogo from '@/assets/turuturustarslogo.png';

interface DashboardSidebarProps {
  onClose?: () => void;
}

const DashboardSidebar = ({ onClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const { profile, roles, isOfficial, signOut, isLoading } = useAuth();
  const userRoles = roles.map(r => r.role);
  const primaryRole = getPrimaryRole(userRoles);
  const isUserOfficial = userRoles.some(r => ['admin', 'treasurer', 'secretary', 'chairperson', 'vice_chairman', 'vice_secretary', 'organizing_secretary', 'committee_member', 'patron', 'coordinator'].includes(r));
  
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
    { label: 'Contributions', href: '/dashboard/finance/contributions', icon: DollarSign, badge: null },
    { label: 'Membership Fees', href: '/dashboard/finance/membership-fees', icon: PiggyBank, badge: null },
    { label: 'Welfare Cases', href: '/dashboard/members/welfare', icon: HandHeart, badge: null },
    { label: 'Announcements', href: '/dashboard/communication/announcements', icon: Bell, badge: 'new' },
    { label: 'Voting', href: '/dashboard/governance/voting', icon: Vote, badge: null },
    { label: 'Private Messages', href: '/dashboard/communication/messages', icon: MessageCircle, badge: null },
    { label: 'Profile', href: '/dashboard/profile', icon: Settings, badge: null },
  ];

  const roleSpecificLinks = () => {
    if (hasRole(userRoles, 'chairperson')) {
      return [
        { label: 'Chair Dashboard', href: `/dashboard/roles/chairperson`, icon: Star },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Welfare Management', href: '/dashboard/members/welfare-management', icon: HandHeart },
        { label: 'Meetings', href: '/dashboard/governance/meetings', icon: FileText },
        { label: 'Announcements', href: '/dashboard/communication/announcements', icon: Bell },
      ];
    }
    if (hasRole(userRoles, 'vice_chairman')) {
      return [
        { label: 'Vice Chairman', href: `/dashboard/roles/vice-chairperson`, icon: Star },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Meetings', href: '/dashboard/governance/meetings', icon: FileText },
        { label: 'Announcements', href: '/dashboard/communication/announcements', icon: Bell },
        { label: 'Welfare Management', href: '/dashboard/members/welfare-management', icon: HandHeart },
        { label: 'Reports', href: '/dashboard/finance/reports', icon: TrendingUp },
        { label: 'Discipline', href: '/dashboard/members/discipline', icon: FileText },
      ];
    }
    if (hasRole(userRoles, 'secretary') || hasRole(userRoles, 'vice_secretary')) {
      return [
        { label: 'Secretary', href: `/dashboard/roles/secretary`, icon: FileText },
        { label: 'Records', href: '/dashboard/governance/secretary-dashboard', icon: ClipboardList },
      ];
    }
    if (hasRole(userRoles, 'treasurer')) {
      return [
        { label: 'Treasury', href: `/dashboard/roles/treasurer`, icon: PiggyBank },
        { label: 'Welfare Management', href: '/dashboard/members/welfare-management', icon: HandHeart },
        { label: 'Payments', href: '/dashboard/finance/mpesa', icon: Smartphone },
        { label: 'Reports', href: '/dashboard/finance/reports', icon: TrendingUp },
      ];
    }
    if (hasRole(userRoles, 'organizing_secretary')) {
      return [
        { label: 'Org Secretary', href: `/dashboard/roles/organizing-secretary`, icon: ClipboardList },
        { label: 'Meetings', href: '/dashboard/governance/meetings', icon: FileText },
        { label: 'Discipline & Fines', href: '/dashboard/members/discipline', icon: FileText },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Reports', href: '/dashboard/finance/reports', icon: TrendingUp },
      ];
    }
    if (hasRole(userRoles, 'patron')) {
      return [
        { label: 'Patron Dashboard', href: `/dashboard/roles/patron`, icon: Star },
        { label: 'Reports', href: '/dashboard/finance/reports', icon: FileText },
      ];
    }
    if (hasRole(userRoles, 'admin')) {
      return [
        { label: 'Admin Dashboard', href: `/dashboard/roles/admin`, icon: Settings },
        { label: 'Members', href: '/dashboard/members', icon: Users },
        { label: 'Welfare Management', href: '/dashboard/members/welfare-management', icon: HandHeart },
        { label: 'Payments', href: '/dashboard/finance/mpesa', icon: Smartphone },
        { label: 'Reports', href: '/dashboard/finance/reports', icon: FileText },
        { label: 'Approvals', href: '/dashboard/admin-panel/approvals', icon: UserCheck },
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
        'h-[100dvh] w-64 md:w-72 max-w-[90vw] bg-gradient-to-b from-card via-card to-card/95',
        'border-r border-border/40 backdrop-blur-xl',
        'flex flex-col overflow-hidden',
        'shadow-xl lg:shadow-none'
      )}
    >
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-10 bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={turuturuLogo}
              alt="Turuturu Stars Logo"
              className="w-7 h-7 object-contain"
              loading="eager"
            />
            <span className="font-serif font-bold text-sm text-foreground">TS</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent/80 rounded-lg transition-all duration-200 active:scale-95"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Logo - Enhanced */}
      <div className="hidden lg:flex items-center gap-3 px-5 py-5 border-b border-border/30">
        <Link
          to="/"
          className="flex items-center gap-2.5 group flex-1 min-w-0"
          onClick={handleNavClick}
        >
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 rounded-lg blur group-hover:blur-md transition-all duration-300" />
            <img 
              src={turuturuLogo}
              alt="Turuturu Stars Logo"
              className="w-10 h-10 object-contain relative hover:scale-110 transition-transform duration-300"
              loading="eager"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-foreground block">
              Turuturu Stars
            </span>
            <span className="text-xs text-muted-foreground/80">Member Portal</span>
          </div>
        </Link>
      </div>

      {/* Member Info Card - Compact & Beautiful */}
      <div className="px-4 py-3 lg:px-5 lg:py-4 border-b border-border/20">
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-primary/10 p-3.5 hover:border-primary/20 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-white/3 to-transparent" />
          
          <div className="relative flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-primary/25 rounded-lg blur group-hover:blur-md transition-all duration-300" />
              <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-sm">
                {profile?.full_name?.charAt(0) || 'M'}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate leading-tight">
                {profile?.full_name?.split(' ')[0] || 'Member'}
              </p>
              <p className="text-xs text-muted-foreground/70 truncate">
                {profile?.membership_number ? `ID: ${profile.membership_number}` : 'Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 lg:px-3 lg:py-4 space-y-0.5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        {/* Member Section */}
        <div>
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
              Menu
            </p>
          </div>
          
          <div className="space-y-0.5">
            {memberLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={handleNavClick}
                  className={cn(
                    'group relative flex items-center justify-between gap-2 px-3 py-2.5 lg:px-3.5 lg:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200',
                    'active:scale-95',
                    isActive
                      ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 lg:hover:bg-accent/40'
                  )}
                >
                  <div className="relative flex items-center gap-2 flex-1 min-w-0">
                    <Icon className={cn(
                      "w-4 h-4 sm:w-[18px] sm:h-[18px] flex-shrink-0 transition-transform duration-200",
                      isActive ? "text-primary-foreground" : "group-hover:scale-110"
                    )} />
                    <span className="truncate text-xs sm:text-sm">{link.label}</span>
                  </div>
                  
                  {link.badge && (
                    <span className="relative flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold rounded-full bg-red-500/90 text-white shadow-sm ml-1 flex-shrink-0">
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
          <div className="mt-4 pt-3 border-t border-border/20">
            <button
              onClick={toggleRoleSection}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 mb-1.5 rounded-lg',
                'text-xs font-bold uppercase tracking-wider transition-all duration-200',
                'hover:bg-accent/50 lg:hover:bg-accent/40 active:scale-95',
                expandedRole 
                  ? 'text-primary bg-primary/8' 
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              <span className="truncate flex items-center gap-1.5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0",
                  expandedRole ? "bg-primary" : "bg-muted-foreground/40"
                )} />
                <span className="text-xs">{primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1).replace('_', ' ')}</span>
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0',
                  expandedRole && 'rotate-180'
                )}
              />
            </button>
            
            <div className={cn(
              "grid transition-all duration-300 ease-in-out",
              expandedRole ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="space-y-0.5 pt-1">
                  {roleSpecificLinks().map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={handleNavClick}
                        className={cn(
                          'group relative flex items-center gap-2 px-3 py-2.5 lg:px-3.5 lg:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200',
                          'active:scale-95',
                          isActive
                            ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 lg:hover:bg-accent/40'
                        )}
                      >
                        <Icon className={cn(
                          "w-4 h-4 sm:w-[18px] sm:h-[18px] flex-shrink-0 transition-transform duration-200",
                          isActive ? "text-primary-foreground" : "group-hover:scale-110"
                        )} />
                        <span className="truncate text-xs sm:text-sm">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Logout Section - Bottom Fixed */}
      <div className="px-2.5 py-3 lg:px-3 lg:py-3.5 border-t border-border/20 bg-gradient-to-t from-primary/5 via-primary/2 to-transparent">
        <Button
          onClick={signOut}
          disabled={isLoading}
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

