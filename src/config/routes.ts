/**
 * Route Configuration - Centralized routing structure
 * Organizing all routes for easy management and navigation
 */

export interface RouteConfig {
  path: string;
  label: string;
  description?: string;
  icon?: string;
  requiresAuth?: boolean;
  roles?: string[];
  children?: RouteConfig[];
}

/**
 * Public Routes - Accessible to everyone
 */
export const PUBLIC_ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  PILLARS: '/pillars',
  CAREERS: '/careers',
  LEADERSHIP: '/leadership',
  BENEFITS: '/benefits',
  HOW_IT_WORKS: '/how-it-works',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
  CONSTITUTION: '/constitution',
  HELP: '/help',
  FAQ: '/faq',
  SUPPORT: '/support',
  REGISTER: '/register',
  AUTH: '/auth',
  LANDING_HOME: '/home',
} as const;

/**
 * Dashboard Routes - Authentication required
 */
export const DASHBOARD_ROUTES = {
  BASE: '/dashboard',
  HOME: '/dashboard/home',
  PROFILE: '/dashboard/profile',
} as const;

/**
 * Financial Management Routes
 */
export const FINANCE_ROUTES = {
  BASE: '/dashboard/finance',
  CONTRIBUTIONS: '/dashboard/finance/contributions',
  ALL_CONTRIBUTIONS: '/dashboard/finance/all-contributions',
  TREASURER_DASHBOARD: '/dashboard/finance/treasurer-dashboard',
  MPESA: '/dashboard/finance/mpesa',
  REPORTS: '/dashboard/finance/reports',
} as const;

/**
 * Member Management Routes
 */
export const MEMBER_ROUTES = {
  BASE: '/dashboard/members',
  MEMBERS: '/dashboard/members',
  WELFARE: '/dashboard/members/welfare',
  WELFARE_MANAGEMENT: '/dashboard/members/welfare-management',
  DISCIPLINE: '/dashboard/members/discipline',
} as const;

/**
 * Governance Routes
 */
export const GOVERNANCE_ROUTES = {
  BASE: '/dashboard/governance',
  MEETINGS: '/dashboard/governance/meetings',
  VOTING: '/dashboard/governance/voting',
  HANDOVER: '/dashboard/governance/handover',
  SECRETARY_DASHBOARD: '/dashboard/governance/secretary-dashboard',
} as const;

/**
 * Communication Routes
 */
export const COMMUNICATION_ROUTES = {
  BASE: '/dashboard/communication',
  ANNOUNCEMENTS: '/dashboard/communication/announcements',
  MESSAGES: '/dashboard/communication/messages',
} as const;

/**
 * Admin Routes
 */
export const ADMIN_ROUTES = {
  BASE: '/dashboard/admin-panel',
  APPROVALS: '/dashboard/admin-panel/approvals',
} as const;

/**
 * Role-Based Dashboard Routes
 */
export const ROLE_ROUTES = {
  BASE: '/dashboard/roles',
  CHAIRPERSON: '/dashboard/roles/chairperson',
  VICE_CHAIRPERSON: '/dashboard/roles/vice-chairperson',
  SECRETARY: '/dashboard/roles/secretary',
  VICE_SECRETARY: '/dashboard/roles/vice-secretary',
  TREASURER: '/dashboard/roles/treasurer',
  ORGANIZING_SECRETARY: '/dashboard/roles/organizing-secretary',
  PATRON: '/dashboard/roles/patron',
  ADMIN: '/dashboard/roles/admin',
} as const;

/**
 * Route Metadata for Sidebar and Navigation
 */
export const DASHBOARD_MENU: RouteConfig[] = [
  {
    path: DASHBOARD_ROUTES.HOME,
    label: 'Dashboard',
    icon: 'Home',
    description: 'Your personal dashboard',
  },
  {
    path: DASHBOARD_ROUTES.PROFILE,
    label: 'Profile',
    icon: 'User',
    description: 'Manage your profile',
  },
  {
    path: FINANCE_ROUTES.BASE,
    label: 'Finance',
    icon: 'DollarSign',
    description: 'Financial management',
    children: [
      {
        path: FINANCE_ROUTES.CONTRIBUTIONS,
        label: 'My Contributions',
        icon: 'TrendingUp',
      },
      {
        path: FINANCE_ROUTES.ALL_CONTRIBUTIONS,
        label: 'All Contributions',
        icon: 'BarChart3',
      },
      {
        path: FINANCE_ROUTES.MPESA,
        label: 'M-Pesa Management',
        icon: 'CreditCard',
      },
      {
        path: FINANCE_ROUTES.REPORTS,
        label: 'Reports',
        icon: 'FileText',
      },
    ],
  },
  {
    path: MEMBER_ROUTES.BASE,
    label: 'Members',
    icon: 'Users',
    description: 'Member management',
    children: [
      {
        path: MEMBER_ROUTES.MEMBERS,
        label: 'Member List',
        icon: 'Users',
      },
      {
        path: MEMBER_ROUTES.WELFARE,
        label: 'Welfare Requests',
        icon: 'Heart',
      },
      {
        path: MEMBER_ROUTES.DISCIPLINE,
        label: 'Discipline',
        icon: 'AlertCircle',
      },
    ],
  },
  {
    path: GOVERNANCE_ROUTES.BASE,
    label: 'Governance',
    icon: 'Scale',
    description: 'Governance and voting',
    children: [
      {
        path: GOVERNANCE_ROUTES.MEETINGS,
        label: 'Meetings',
        icon: 'Calendar',
      },
      {
        path: GOVERNANCE_ROUTES.VOTING,
        label: 'Voting',
        icon: 'CheckCircle2',
      },
      {
        path: GOVERNANCE_ROUTES.HANDOVER,
        label: 'Role Handover',
        icon: 'ArrowRightLeft',
      },
    ],
  },
  {
    path: COMMUNICATION_ROUTES.BASE,
    label: 'Communication',
    icon: 'MessageSquare',
    description: 'Announcements and messages',
    children: [
      {
        path: COMMUNICATION_ROUTES.ANNOUNCEMENTS,
        label: 'Announcements',
        icon: 'Megaphone',
      },
      {
        path: COMMUNICATION_ROUTES.MESSAGES,
        label: 'Messages',
        icon: 'Mail',
      },
    ],
  },
  {
    path: ROLE_ROUTES.BASE,
    label: 'Role Dashboards',
    icon: 'Shield',
    description: 'Role-specific dashboards',
  },
  {
    path: ADMIN_ROUTES.BASE,
    label: 'Administration',
    icon: 'Settings',
    description: 'Admin controls',
    roles: ['admin'],
    children: [
      {
        path: ADMIN_ROUTES.APPROVALS,
        label: 'Approvals',
        icon: 'CheckSquare',
      },
    ],
  },
];

/**
 * Breadcrumb Mapping
 */
export const BREADCRUMB_LABELS: Record<string, string> = {
  // Dashboard
  dashboard: 'Dashboard',
  home: 'Home',
  profile: 'My Profile',

  // Finance
  finance: 'Finance',
  contributions: 'Contributions',
  'all-contributions': 'All Contributions',
  'treasurer-dashboard': 'Treasurer Dashboard',
  mpesa: 'M-Pesa Management',
  reports: 'Reports',

  // Members
  members: 'Members',
  welfare: 'Welfare',
  'welfare-management': 'Welfare Management',
  discipline: 'Discipline',

  // Governance
  governance: 'Governance',
  meetings: 'Meetings',
  voting: 'Voting',
  handover: 'Role Handover',
  'secretary-dashboard': 'Secretary Dashboard',

  // Communication
  communication: 'Communication',
  announcements: 'Announcements',
  messages: 'Private Messages',

  // Admin
  'admin-panel': 'Administration',
  approvals: 'Approvals',

  // Roles
  roles: 'Role Dashboards',
  chairperson: 'Chairperson',
  'vice-chairperson': 'Vice Chairperson',
  secretary: 'Secretary',
  'vice-secretary': 'Vice Secretary',
  treasurer: 'Treasurer',
  'organizing-secretary': 'Organizing Secretary',
  patron: 'Patron',
  admin: 'Administrator',

  // Public pages
  about: 'About Us',
  pillars: 'Our Pillars',
  careers: 'Careers',
  leadership: 'Leadership',
  benefits: 'Benefits',
  'how-it-works': 'How It Works',
  'privacy-policy': 'Privacy Policy',
  'terms-of-service': 'Terms of Service',
  constitution: 'Constitution',
  help: 'Help Center',
  faq: 'FAQ',
  support: 'Support',
  register: 'Register',
  auth: 'Authentication',
};

/**
 * Helper function to get all routes
 */
export const getAllRoutes = () => {
  return {
    ...PUBLIC_ROUTES,
    ...DASHBOARD_ROUTES,
    ...FINANCE_ROUTES,
    ...MEMBER_ROUTES,
    ...GOVERNANCE_ROUTES,
    ...COMMUNICATION_ROUTES,
    ...ADMIN_ROUTES,
    ...ROLE_ROUTES,
  };
};

/**
 * Helper function to check if a route requires authentication
 */
export const requiresAuth = (path: string): boolean => {
  return path.startsWith('/dashboard');
};

/**
 * Helper function to get breadcrumb path
 */
export const getBreadcrumbPath = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => ({
    label: BREADCRUMB_LABELS[segment] || segment,
    path: '/' + segments.slice(0, index + 1).join('/'),
  }));
};

/**
 * Role-based route access
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  member: [
    DASHBOARD_ROUTES.HOME,
    DASHBOARD_ROUTES.PROFILE,
    FINANCE_ROUTES.CONTRIBUTIONS,
    COMMUNICATION_ROUTES.ANNOUNCEMENTS,
  ],
  treasurer: [
    DASHBOARD_ROUTES.HOME,
    FINANCE_ROUTES.ALL_CONTRIBUTIONS,
    FINANCE_ROUTES.TREASURER_DASHBOARD,
    FINANCE_ROUTES.MPESA,
    FINANCE_ROUTES.REPORTS,
  ],
  secretary: [
    DASHBOARD_ROUTES.HOME,
    MEMBER_ROUTES.MEMBERS,
    GOVERNANCE_ROUTES.SECRETARY_DASHBOARD,
  ],
  chairperson: [
    DASHBOARD_ROUTES.HOME,
    ROLE_ROUTES.CHAIRPERSON,
  ],
  admin: [
    DASHBOARD_ROUTES.HOME,
    ADMIN_ROUTES.APPROVALS,
  ],
};

export default {
  PUBLIC_ROUTES,
  DASHBOARD_ROUTES,
  FINANCE_ROUTES,
  MEMBER_ROUTES,
  GOVERNANCE_ROUTES,
  COMMUNICATION_ROUTES,
  ADMIN_ROUTES,
  ROLE_ROUTES,
  DASHBOARD_MENU,
  BREADCRUMB_LABELS,
  ROLE_PERMISSIONS,
};
