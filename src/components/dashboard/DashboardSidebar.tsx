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

const DashboardSidebar = () => {
  const location = useLocation();
  const { profile, roles, isOfficial, hasRole, signOut } = useAuth();

  const memberLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Contributions', href: '/dashboard/contributions', icon: DollarSign },
    { label: 'Welfare Cases', href: '/dashboard/welfare', icon: HandHeart },
    { label: 'Announcements', href: '/dashboard/announcements', icon: Bell },
    { label: 'My Profile', href: '/dashboard/profile', icon: Settings },
  ];

  const officialLinks = [
    { label: 'Members', href: '/dashboard/members', icon: Users },
    { label: 'Pending Approvals', href: '/dashboard/approvals', icon: UserCheck },
    { label: 'All Contributions', href: '/dashboard/all-contributions', icon: TrendingUp },
    { label: 'Reports', href: '/dashboard/reports', icon: FileText },
  ];

  const treasurerLinks = [
    { label: 'Treasurer Dashboard', href: '/dashboard/treasurer', icon: PiggyBank },
    { label: 'M-Pesa Management', href: '/dashboard/mpesa', icon: Smartphone },
  ];

  const secretaryLinks = [
    { label: 'Secretary Dashboard', href: '/dashboard/secretary', icon: ClipboardList },
  ];

  const canAccessTreasurer = hasRole('treasurer') || hasRole('admin') || hasRole('chairperson');
  const canAccessSecretary = hasRole('secretary') || hasRole('admin') || hasRole('chairperson');

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

        {isOfficial() && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-3">
              Officials
            </p>
            {officialLinks.map((link) => {
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

        {canAccessTreasurer && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-3">
              Treasury
            </p>
            {treasurerLinks.map((link) => {
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

        {canAccessSecretary && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-3">
              Secretary
            </p>
            {secretaryLinks.map((link) => {
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