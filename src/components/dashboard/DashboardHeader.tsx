import { Menu, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import React, { useState, Suspense, lazy } from 'react';

const ChatSidebar = lazy(() => import('@/components/chat/ChatSidebar'));

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
}

const DashboardHeader = ({ onMenuToggle }: DashboardHeaderProps) => {
  const { profile, roles } = useAuth();
  const [showChat, setShowChat] = useState(false);

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
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'dormant':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Member';

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 transition-all duration-200">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 h-9 w-9 hover:bg-accent transition-colors"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">
            Welcome, <span className="hidden xs:inline">{firstName}</span>
            <span className="xs:hidden">{firstName.slice(0, 10)}{firstName.length > 10 ? '...' : ''}</span>
          </h1>
          
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
            <Badge 
              variant="outline" 
              className="text-xs px-1.5 sm:px-2 py-0 h-5 whitespace-nowrap"
            >
              {getRoleBadge()}
            </Badge>
            <Badge 
              className={`text-xs px-1.5 sm:px-2 py-0 h-5 whitespace-nowrap transition-colors ${getStatusColor(profile?.status)}`}
            >
              {profile?.status || 'Pending'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Button variant="ghost" size="icon" aria-label="Open chat" onClick={() => setShowChat(true)}>
          <MessageSquare className="w-5 h-5" />
        </Button>
        <NotificationBell />
        {showChat ? (
          <Suspense fallback={null}>
            <ChatSidebar onClose={() => setShowChat(false)} />
          </Suspense>
        ) : null}
      </div>
    </header>
  );
};

export default DashboardHeader;