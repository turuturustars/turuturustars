import { Menu, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { cn } from '@/lib/utils';
import turuturuLogo from '@/assets/turuturustarslogo.png';

const ChatSidebar = lazy(() => import('@/components/chat/ChatSidebar'));

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
}

const DashboardHeader = ({ onMenuToggle }: DashboardHeaderProps) => {
  const { profile, roles = [] } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('Morning');
    else if (hour < 17) setTimeOfDay('Afternoon');
    else setTimeOfDay('Evening');
  }, []);

  useEffect(() => {
    if (!showChat) return;
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [showChat]);

  const getRoleBadge = () => {
    const officialRoles = roles.filter((r) => r !== 'member');
    const role = officialRoles[0];
    if (!role) return 'Member';
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRoleIcon = () => {
    const officialRoles = roles.filter((r) => r !== 'member');
    return officialRoles.length > 0 ? <Sparkles className="w-3 h-3" /> : null;
  };

  const getStatusConfig = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20',
          dot: 'bg-emerald-500',
          label: 'Active'
        };
      case 'pending':
        return {
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20',
          dot: 'bg-amber-500',
          label: 'Pending'
        };
      case 'dormant':
        return {
          color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20',
          dot: 'bg-rose-500',
          label: 'Dormant'
        };
      default:
        return {
          color: 'bg-muted text-muted-foreground border-border/50',
          dot: 'bg-muted-foreground',
          label: 'Unknown'
        };
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Member';
  const statusConfig = getStatusConfig(profile?.status);

  return (
    <>
      <header 
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          'bg-gradient-to-r from-white/92 via-blue-50/85 to-white/90 dark:from-background/85 dark:via-card/85 dark:to-background/85',
          'backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-card/85',
          'border-b',
          scrolled 
            ? 'border-border/70 shadow-2xl shadow-primary/15 backdrop-blur-2xl'
            : 'border-border/30 shadow-sm shadow-black/5'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-70" />
        <div className={cn(
          'absolute inset-0 pointer-events-none transition-opacity duration-300',
          scrolled ? 'opacity-60' : 'opacity-30'
        )}>
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute inset-x-4 bottom-0 h-[6px] rounded-full bg-gradient-to-r from-primary/25 via-cyan-400/25 to-transparent blur-2xl" />
        </div>
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="h-14 sm:h-16 md:h-18 flex items-center justify-between gap-3">
          {/* Left Section */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0 flex-1">
            {/* Logo and Menu */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'lg:hidden shrink-0 h-10 w-10 rounded-2xl transition-all duration-200',
                  'bg-card/60 border border-border/50 hover:border-primary/40',
                  'hover:bg-primary/10 hover:text-primary active:scale-95',
                  'hover:shadow-md hover:shadow-primary/10'
                )}
                onClick={onMenuToggle}
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              {/* Logo */}
              <img 
                src={turuturuLogo}
                alt="Turuturu Stars Logo"
                className="h-10 w-auto hidden sm:block object-contain transition-transform duration-300 hover:scale-110"
                loading="eager"
                width="40"
                height="40"
                decoding="async"
              />
            </div>
            
            <div className="min-w-0 flex-1 max-w-2xl">
              {/* Greeting */}
              <div className="flex items-baseline gap-2 mb-1">
                <h1 className="font-serif text-base sm:text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground/70 bg-clip-text text-transparent truncate">
                  Good {timeOfDay}
                  <span className="hidden xs:inline">, {firstName}</span>
                </h1>
              </div>
              
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 h-6 font-medium",
                    "bg-primary/5 border-primary/25 text-primary shadow-sm shadow-primary/15",
                    "hover:bg-primary/10 transition-colors duration-200",
                    "flex items-center gap-1.5"
                  )}
                >
                  {getRoleIcon()}
                  <span className="whitespace-nowrap">{getRoleBadge()}</span>
                </Badge>
                
                <Badge 
                  className={cn(
                    "text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 h-6 font-medium border",
                    "transition-all duration-200 hover:scale-105 shadow-sm",
                    "flex items-center gap-1.5",
                    statusConfig.color
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    statusConfig.dot,
                    profile?.status === 'active' && "animate-pulse"
                  )} />
                  <span className="whitespace-nowrap">{statusConfig.label}</span>
                </Badge>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                'h-10 w-10 rounded-xl transition-all duration-200 relative group',
                'bg-card/60 border border-border/50 hover:border-primary/40',
                'hover:bg-accent active:scale-95',
                showChat && 'bg-accent text-primary'
              )}
              aria-label="Open chat" 
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              {/* Optional unread indicator */}
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            
            <div className="h-8 w-px bg-border/50 hidden sm:block" />
            
            <NotificationBell />
          </div>
        </div>

        {/* Animated gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent">
          <div 
            className={cn(
              "h-full bg-gradient-to-r from-primary/0 via-primary to-primary/0 transition-opacity duration-500",
              scrolled ? "opacity-100" : "opacity-0"
            )} 
          />
        </div>
      </header>

      {/* Chat Sidebar */}
      {showChat && (
        <Suspense fallback={null}>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowChat(false)}
            aria-hidden="true"
          />
          <ChatSidebar onClose={() => setShowChat(false)} />
        </Suspense>
      )}
    </>
  );
};

export default DashboardHeader;
