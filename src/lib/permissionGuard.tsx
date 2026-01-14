import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, PermissionKey } from '@/lib/rolePermissions';

interface PermissionGuardProps {
  permission: PermissionKey;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const { roles } = useAuth();
  const userRoles = roles.map(r => r.role);

  if (!hasPermission(userRoles, permission)) {
    return fallback;
  }

  return children;
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: PermissionKey): boolean {
  const { roles } = useAuth();
  const userRoles = roles.map(r => r.role);
  return hasPermission(userRoles, permission);
}

/**
 * Hook to get all user permissions
 */
export function usePermissions() {
  const { roles } = useAuth();
  const userRoles = roles.map(r => r.role);
  
  return {
    roles: userRoles,
    hasPermission: (perm: PermissionKey) => hasPermission(userRoles, perm),
    canViewMembers: hasPermission(userRoles, 'view_member_registry'),
    canManagePayments: hasPermission(userRoles, 'manage_payments'),
    canCreateMeetings: hasPermission(userRoles, 'create_meetings'),
    canSendAnnouncements: hasPermission(userRoles, 'send_announcements'),
    canManageDiscipline: hasPermission(userRoles, 'manage_discipline'),
    canHandleSecretary: hasPermission(userRoles, 'manage_secretary_tasks'),
  };
}
