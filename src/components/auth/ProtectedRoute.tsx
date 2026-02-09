import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isProfileComplete } from '@/utils/profileCompletion';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  /**
   * When true, users without the required role are quietly redirected
   * to the dashboard home instead of seeing an access denied screen.
   * Use for hidden/privileged routes so other roles don't learn they exist.
   */
  stealth?: boolean;
}

/**
 * ProtectedRoute Component
 * Prevents access to protected routes without authentication
 * Optionally checks for specific roles
 */
export const ProtectedRoute = ({ children, requiredRoles, stealth = false }: ProtectedRouteProps) => {
  const { user, roles, profile, status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user || status === 'signed-out') {
    // Redirect to auth page but save the location they were trying to visit
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Allow dedicated flows to render without redirect loops
  if (location.pathname === '/profile-setup' && status === 'needs-profile') {
    return <>{children}</>;
  }
  if (location.pathname.startsWith('/auth/email-confirmation') && status === 'needs-email-verification') {
    return <>{children}</>;
  }

  // Require verified email
  if (status === 'needs-email-verification') {
    return <Navigate to="/auth/email-confirmation" replace />;
  }

  // Force profile completion before accessing protected pages
  if (status === 'needs-profile' || !isProfileComplete(profile as any)) {
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }

  // Check if user has required roles
  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = roles.map((r) => r.role);
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role as typeof userRoles[number]));

    if (!hasRequiredRole) {
      // For sensitive routes, fail quietly to avoid leaking that the route exists
      if (stealth) return <Navigate to="/dashboard/home" replace />;

      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <a href="/dashboard" className="text-primary hover:underline">
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard Component
 * Simple authentication check without role validation
 */
export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * PublicRoute Component
 * Redirects authenticated users away from auth pages
 */
export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { user, profile, status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and trying to access auth page, redirect only if profile is complete
  if (user && window.location.pathname === '/auth') {
    if (status === 'ready' && isProfileComplete(profile as any)) return <Navigate to="/dashboard" replace />;
    if (status === 'needs-profile') return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
};

export default {
  ProtectedRoute,
  AuthGuard,
  PublicRoute,
};
