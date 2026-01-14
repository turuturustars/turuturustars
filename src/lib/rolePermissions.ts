/**
 * Role-based permissions and access control
 */

export type UserRole = 
  | 'admin' 
  | 'chairperson' 
  | 'vice_chairperson'
  | 'secretary' 
  | 'vice_secretary'
  | 'treasurer' 
  | 'organizing_secretary'
  | 'committee_member'
  | 'patron'
  | 'member';

export type PermissionKey = 
  | 'view_member_registry'
  | 'manage_members'
  | 'approve_members'
  | 'manage_roles'
  | 'view_financial_reports'
  | 'manage_payments'
  | 'process_payments'
  | 'view_all_contributions'
  | 'create_meetings'
  | 'manage_meetings'
  | 'send_announcements'
  | 'view_announcements'
  | 'manage_secretary_tasks'
  | 'handle_correspondence'
  | 'record_minutes'
  | 'manage_discipline'
  | 'record_incidents'
  | 'raise_issues'
  | 'view_disciplines'
  | 'view_patron_dashboard'
  | 'manage_community'
  | 'view_chat'
  | 'send_chat_messages'
  | 'view_my_contributions'
  | 'send_payment'
  | 'handover_role'
  | 'approve_reports'
  | 'manage_voting';

// Role hierarchy for permission inheritance
export const roleHierarchy: Record<UserRole, UserRole[]> = {
  'admin': [],
  'chairperson': ['committee_member', 'member'],
  'vice_chairperson': ['chairperson', 'committee_member', 'member'],
  'secretary': ['committee_member', 'member'],
  'vice_secretary': ['secretary', 'committee_member', 'member'],
  'treasurer': ['committee_member', 'member'],
  'organizing_secretary': ['committee_member', 'member'],
  'committee_member': ['member'],
  'patron': ['member'],
  'member': [],
};

// Permissions by role
export const rolePermissions: Record<UserRole, PermissionKey[]> = {
  'admin': [
    'view_member_registry',
    'manage_members',
    'approve_members',
    'manage_roles',
    'view_financial_reports',
    'manage_payments',
    'process_payments',
    'view_all_contributions',
    'create_meetings',
    'manage_meetings',
    'send_announcements',
    'view_announcements',
    'manage_secretary_tasks',
    'handle_correspondence',
    'record_minutes',
    'manage_discipline',
    'record_incidents',
    'view_disciplines',
    'view_patron_dashboard',
    'manage_community',
    'view_chat',
    'send_chat_messages',
    'handover_role',
    'approve_reports',
    'manage_voting',
  ],
  'chairperson': [
    'view_member_registry',
    'manage_members',
    'create_meetings',
    'manage_meetings',
    'send_announcements',
    'view_announcements',
    'handover_role',
    'manage_community',
    'view_chat',
    'send_chat_messages',
    'view_disciplines',
    'approve_reports',
  ],
  'vice_chairperson': [
    'view_member_registry',
    'manage_members',
    'create_meetings',
    'manage_meetings',
    'send_announcements',
    'view_announcements',
    'handover_role',
    'manage_community',
    'view_chat',
    'send_chat_messages',
    'view_disciplines',
    'approve_reports',
    'manage_voting',
  ],
  'secretary': [
    'view_member_registry',
    'manage_secretary_tasks',
    'handle_correspondence',
    'record_minutes',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
  ],
  'vice_secretary': [
    'view_member_registry',
    'manage_secretary_tasks',
    'handle_correspondence',
    'record_minutes',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
  ],
  'treasurer': [
    'view_member_registry',
    'view_financial_reports',
    'manage_payments',
    'process_payments',
    'view_all_contributions',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
  ],
  'organizing_secretary': [
    'view_member_registry',
    'manage_discipline',
    'record_incidents',
    'view_disciplines',
    'create_meetings',
    'manage_meetings',
    'view_all_contributions',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
  ],
  'committee_member': [
    'raise_issues',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'view_my_contributions',
  ],
  'patron': [
    'view_patron_dashboard',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
  ],
  'member': [
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'raise_issues',
    'view_my_contributions',
    'send_payment',
  ],
};

// Feature visibility by role
export const roleFeatures: Record<UserRole, string[]> = {
  'admin': [
    'dashboard',
    'members',
    'payments',
    'meetings',
    'secretary',
    'discipline',
    'roles',
    'reports',
    'community',
  ],
  'chairperson': [
    'dashboard',
    'members',
    'meetings',
    'announcements',
    'community',
  ],
  'vice_chairperson': [
    'dashboard',
    'members',
    'meetings',
    'announcements',
    'community',
  ],
  'secretary': [
    'dashboard',
    'secretary',
    'announcements',
    'members-basic',
  ],
  'vice_secretary': [
    'dashboard',
    'secretary',
    'announcements',
    'members-basic',
  ],
  'treasurer': [
    'dashboard',
    'payments',
    'reports',
    'members-basic',
  ],
  'organizing_secretary': [
    'dashboard',
    'discipline',
    'meetings',
    'members',
    'reports',
  ],
  'committee_member': [
    'dashboard',
    'community',
    'announcements',
  ],
  'patron': [
    'dashboard-patron',
    'reports',
    'community',
  ],
  'member': [
    'dashboard',
    'community',
    'announcements',
  ],
};

export function hasPermission(userRoles: UserRole[], permission: PermissionKey): boolean {
  return userRoles.some(role => {
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission);
  });
}

export function hasRole(userRoles: UserRole[], role: UserRole): boolean {
  return userRoles.includes(role) || userRoles.some(r => roleHierarchy[r]?.includes(role));
}

export function isOfficial(userRoles: UserRole[]): boolean {
  const officialRoles: UserRole[] = ['admin', 'chairperson', 'vice_chairperson', 'secretary', 'vice_secretary', 'treasurer', 'organizing_secretary', 'committee_member'];
  return userRoles.some(role => officialRoles.includes(role));
}

export function isManagementCommittee(userRoles: UserRole[]): boolean {
  const mcRoles: UserRole[] = ['admin', 'chairperson', 'vice_chairperson', 'secretary', 'vice_secretary', 'treasurer'];
  return userRoles.some(role => mcRoles.includes(role));
}

export function getPrimaryRole(userRoles: UserRole[]): UserRole {
  // Return the highest priority role
  const priority: UserRole[] = [
    'admin',
    'chairperson',
    'vice_chairperson',
    'secretary',
    'vice_secretary',
    'treasurer',
    'organizing_secretary',
    'committee_member',
    'patron',
    'member',
  ];
  
  for (const role of priority) {
    if (userRoles.includes(role)) {
      return role;
    }
  }
  
  return 'member';
}
