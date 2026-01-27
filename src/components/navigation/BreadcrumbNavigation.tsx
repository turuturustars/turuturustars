import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getBreadcrumbPath } from '@/config/routes';
import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  className?: string;
  showHome?: boolean;
}

export const BreadcrumbNavigation = ({ className, showHome = true }: BreadcrumbProps) => {
  const location = useLocation();
  const breadcrumbPath = getBreadcrumbPath(location.pathname);

  if (breadcrumbPath.length === 0 && !showHome) return null;

  return (
    <nav
      className={cn(
        'flex items-center gap-1 text-sm px-4 py-2 bg-muted/30 rounded-lg overflow-x-auto',
        className,
      )}
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            title="Go to dashboard"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          {breadcrumbPath.length > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </>
      )}

      {breadcrumbPath.map((crumb, index) => {
        const isLast = index === breadcrumbPath.length - 1;

        return (
          <div key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
            {isLast ? (
              <span
                className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <>
                <Link
                  to={crumb.path}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px] sm:max-w-none"
                >
                  {crumb.label}
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default BreadcrumbNavigation;
