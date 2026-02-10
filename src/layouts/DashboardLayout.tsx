import { useEffect, useState, memo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import NotificationToastListener from '@/components/notifications/NotificationToastListener';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

const Sidebar = memo(DashboardSidebar);

const DashboardLayout = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Scroll lock for mobile sidebar
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [mobileOpen]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineNotice(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineNotice(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="flex flex-col items-center gap-6 px-4">
          {/* Animated logo/spinner container */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-background/80 backdrop-blur-sm rounded-full p-6 border-2 border-primary/20 shadow-xl">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
          
          {/* Loading text */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Loading Dashboard</h3>
            <p className="text-sm text-muted-foreground animate-pulse">
              Please wait while we prepare your workspace...
            </p>
          </div>

          {/* Loading bar animation */}
          <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-theme relative flex min-h-[100dvh] bg-gradient-to-br from-background via-section-accent/40 to-section-light">
      {/* Offline Notice */}
      {showOfflineNotice && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-2 text-center text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>You are currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 lg:flex-col border-r border-border/50 bg-background/95 backdrop-blur-sm shadow-sm">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          aria-hidden="false"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          />

          {/* Sidebar Drawer */}
          <aside
            className="absolute inset-y-0 left-0 w-64 md:w-72 max-w-[90vw] bg-background shadow-2xl animate-in slide-in-from-left duration-300 border-r border-border"
          >
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <NotificationToastListener />
        {/* Header */}
        <div className="relative z-30">
          <DashboardHeader onMenuToggle={() => setMobileOpen(true)} />
          {/* Spacer to offset fixed header height */}
          <div className="h-14 sm:h-16 md:h-18" aria-hidden />
        </div>

        {/* Main Content */}
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-6 lg:px-8 lg:py-8">
            {/* Content wrapper with subtle animations */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Footer (Optional) */}
        <footer className="border-t border-border/50 bg-muted/30 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>(c) {new Date().getFullYear()} Turuturu Stars</span>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline">All rights reserved</span>
              </div>
              
              <div className="flex items-center gap-4">
                {isOnline ? (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="font-medium">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="font-medium">Offline</span>
                  </div>
                )}
                <span>|</span>
                <button className="hover:text-foreground transition-colors">
                  Privacy Policy
                </button>
                <span>|</span>
                <button className="hover:text-foreground transition-colors">
                  Terms
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Scroll to top button (appears when scrolled down) */}
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
