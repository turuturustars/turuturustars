/**
 * Role types for the application
 */

export type UserRole = 
  | 'admin'
  | 'treasurer'
  | 'secretary'
  | 'chairperson'
  | 'vice_chairman'
  | 'vice_secretary'
  | 'organizing_secretary'
  | 'committee_member'
  | 'patron'
  | 'coordinator'
  | 'member';

export interface RoleInfo {
  id: UserRole;
  title: string;
  description: string;
  permissions: string[];
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  chairperson: 90,
  vice_chairman: 80,
  treasurer: 70,
  secretary: 60,
  vice_secretary: 50,
  organizing_secretary: 40,
  committee_member: 30,
  patron: 20,
  coordinator: 20,
  member: 10,
};

export function hasHigherRole(userRoles: UserRole[], requiredRole: UserRole): boolean {
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userRoles.some(role => (ROLE_HIERARCHY[role] || 0) >= requiredLevel);
}
