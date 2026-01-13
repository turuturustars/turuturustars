import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
}

const DashboardHeader = ({ onMenuToggle }: DashboardHeaderProps) => {
  const { profile, roles } = useAuth();

  const getRoleBadge = () => {
    const officialRoles = roles.filter((r) => r.role !== 'member');
    if (officialRoles.length > 0) {
      return officialRoles[0].role.charAt(0).toUpperCase() + officialRoles[0].role.slice(1);
    }
    return 'Member';
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'dormant':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-serif text-xl font-semibold text-foreground">
            Welcome, {profile?.full_name?.split(' ')[0] || 'Member'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">
              {getRoleBadge()}
            </Badge>
            <Badge className={`text-xs ${getStatusColor(profile?.status)}`}>
              {profile?.status || 'Pending'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  );
};

export default DashboardHeader;