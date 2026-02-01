import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DASHBOARD_MENU, DASHBOARD_ROUTES } from '@/config/routes';
import { 
  Menu, 
  X, 
  ChevronRight, 
  LogOut,
  Home,
  User,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  item: typeof DASHBOARD_MENU[0];
  isActive: boolean;
  onNavigate?: () => void;
}

const NavItem = ({ item, isActive, onNavigate }: NavItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(item.path);
    onNavigate?.();
  };

  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <span className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{item.icon}</span>
          <span className="font-medium truncate">{item.label}</span>
        </span>
        {hasChildren && (
          <ChevronRight
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-transform',
              isOpen && 'rotate-90',
            )}
          />
        )}
      </button>

      {hasChildren && isOpen && (
        <div className="mt-2 space-y-1 border-l-2 border-muted ml-3 pl-3">
          {item.children.map((child) => (
            <Link
              key={child.path}
              to={child.path}
              onClick={onNavigate}
              className={cn(
                'block px-3 py-2 rounded-lg text-sm transition-all duration-200',
                window.location.pathname === child.path
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

interface EnhancedNavigationProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export const EnhancedNavigation = ({ onClose, isOpen = false }: EnhancedNavigationProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<string[]>([]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleItem = (path: string) => {
    setOpenItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  if (!user) return null;

  const navContent = (
    <ScrollArea className="h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-6 border-b border-border">
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2 p-4">
          {DASHBOARD_MENU.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
              onNavigate={onClose}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Link to={DASHBOARD_ROUTES.PROFILE}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={onClose}
            >
              <User className="h-4 w-4" />
              My Profile
            </Button>
          </Link>
          <Link to="/help">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={onClose}
            >
              <HelpCircle className="h-4 w-4" />
              Help & Support
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <div className="flex items-center gap-2 md:hidden">
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {navContent}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EnhancedNavigation;
