/**
 * Role-based permissions and access control
 */

export type UserRole = 
  | 'admin' 
  | 'chairperson' 
  | 'vice_chairman'
  | 'secretary' 
  | 'vice_secretary'
  | 'treasurer' 
  | 'organizing_secretary'
  | 'committee_member'
  | 'patron'
  | 'coordinator'
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
  | 'manage_voting'
  | 'create_voting'
  | 'cast_vote'
  | 'view_voting_results'
  | 'create_welfare'
  | 'manage_welfare'
  | 'manage_welfare_transactions'
  | 'refund_welfare'
  | 'record_welfare_payment';

// Role hierarchy for permission inheritance
export const roleHierarchy: Record<UserRole, UserRole[]> = {
  'admin': [
    'chairperson',
    'vice_chairman',
    'secretary',
    'vice_secretary',
    'treasurer',
    'organizing_secretary',
    'committee_member',
    'patron',
    'coordinator',
    'member',
  ],
  'chairperson': ['committee_member', 'member'],
  'vice_chairman': ['chairperson', 'committee_member', 'member'],
  'secretary': ['committee_member', 'member'],
  'vice_secretary': ['secretary', 'committee_member', 'member'],
  'treasurer': ['committee_member', 'member'],
  'organizing_secretary': ['committee_member', 'member'],
  'committee_member': ['member'],
  'patron': ['member'],
  'coordinator': ['committee_member', 'member'],
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
    'create_voting',
    'cast_vote',
    'view_voting_results',
    'create_welfare',
    'manage_welfare',
    'manage_welfare_transactions',
    'refund_welfare',
    'record_welfare_payment',
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
    'manage_voting',
    'create_voting',
    'cast_vote',
    'view_voting_results',
    'create_welfare',
    'manage_welfare',
    'manage_welfare_transactions',
    'refund_welfare',
    'record_welfare_payment',
  ],
  'vice_chairman': [
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
    'create_voting',
    'cast_vote',
    'view_voting_results',
  ],
  'secretary': [
    'view_member_registry',
    'manage_secretary_tasks',
    'handle_correspondence',
    'record_minutes',
    'send_announcements',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'manage_voting',
    'create_voting',
    'cast_vote',
    'view_voting_results',
    'create_welfare',
    'manage_welfare',
  ],
  'vice_secretary': [
    'view_member_registry',
    'manage_secretary_tasks',
    'handle_correspondence',
    'record_minutes',
    'send_announcements',
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
    'send_announcements',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'create_welfare',
    'manage_welfare',
    'manage_welfare_transactions',
    'refund_welfare',
    'record_welfare_payment',
  ],
  'organizing_secretary': [
    'view_member_registry',
    'manage_discipline',
    'record_incidents',
    'view_disciplines',
    'create_meetings',
    'manage_meetings',
    'view_all_contributions',
    'send_announcements',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'manage_voting',
    'create_voting',
    'cast_vote',
    'view_voting_results',
  ],
  'committee_member': [
    'raise_issues',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'view_my_contributions',
    'cast_vote',
    'view_voting_results',
  ],
  'patron': [
    'view_patron_dashboard',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'create_welfare',
    'manage_welfare',
  ],
  'coordinator': [
    'raise_issues',
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'view_my_contributions',
    'cast_vote',
    'view_voting_results',
  ],
  'member': [
    'view_announcements',
    'view_chat',
    'send_chat_messages',
    'raise_issues',
    'view_my_contributions',
    'send_payment',
    'cast_vote',
    'view_voting_results',
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
  'vice_chairman': [
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
  'coordinator': [
    'dashboard',
    'community',
    'announcements',
  ],
  'member': [
    'dashboard',
    'community',
    'announcements',
  ],
};

/**
 * Normalize roles coming from Supabase.
 * The database returns an array of role strings, but some components
 * previously assumed objects shaped like { role: string }.
 * This helper ensures we always operate on the string union type.
 */
const ALL_ROLES: UserRole[] = [
  'admin',
  'chairperson',
  'vice_chairman',
  'secretary',
  'vice_secretary',
  'treasurer',
  'organizing_secretary',
  'committee_member',
  'patron',
  'coordinator',
  'member',
];

type RoleLike = UserRole | { role: UserRole } | string | { role: string } | null | undefined;

export function normalizeRoles(roles: RoleLike[]): UserRole[] {
  const toRole = (value: RoleLike): UserRole | null => {
    if (!value) return null;

    if (typeof value === 'string' && (ALL_ROLES as string[]).includes(value)) {
      return value as UserRole;
    }

    if (typeof value === 'object' && 'role' in value) {
      const candidate = (value as { role?: unknown }).role;
      if (typeof candidate === 'string' && (ALL_ROLES as string[]).includes(candidate)) {
        return candidate as UserRole;
      }
    }

    return null;
  };

  const normalized = roles
    .map(toRole)
    .filter((role): role is UserRole => Boolean(role));

  // Deduplicate while preserving order
  return Array.from(new Set(normalized));
}

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
  const officialRoles: UserRole[] = ['admin', 'chairperson', 'vice_chairman', 'secretary', 'vice_secretary', 'treasurer', 'organizing_secretary', 'committee_member', 'coordinator', 'patron'];
  return userRoles.some(role => officialRoles.includes(role));
}

export function isManagementCommittee(userRoles: UserRole[]): boolean {
  const mcRoles: UserRole[] = ['admin', 'chairperson', 'vice_chairman', 'secretary', 'vice_secretary', 'treasurer'];
  return userRoles.some(role => mcRoles.includes(role));
}

export function getPrimaryRole(userRoles: UserRole[]): UserRole {
  // Return the highest priority role
  const priority: UserRole[] = [
    'admin',
    'chairperson',
    'vice_chairman',
    'secretary',
    'vice_secretary',
    'treasurer',
    'organizing_secretary',
    'committee_member',
    'patron',
    'coordinator',
    'member',
  ];
  
  for (const role of priority) {
    if (userRoles.includes(role)) {
      return role;
    }
  }
  
  return 'member';
}
