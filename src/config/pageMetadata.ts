import { PageMetaData } from '@/hooks/usePageMeta';

/**
 * Central location for all page metadata
 * Ensures consistency across the application and makes it easy to update
 */

export const PAGE_METADATA: Record<string, PageMetaData> = {
  // Public Pages
  HOME: {
    title: 'Turuturu Stars CBO - Community Based Organization Kenya',
    description:
      'Join Turuturu Stars, a vibrant community organization dedicated to mutual help and growth. Manage contributions, welfare assistance, and community events.',
    keywords: [
      'CBO Kenya',
      'community organization',
      'contributions',
      'welfare',
      'membership',
      'Turuturu Stars',
    ],
    canonicalUrl: 'https://turuturustars.co.ke',
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
  },

  AUTH: {
    title: 'Login & Register - Turuturu Stars CBO',
    description:
      'Create your account or log in to Turuturu Stars Community Platform. Join us to manage contributions, welfare assistance, and community activities.',
    keywords: ['login', 'register', 'sign up', 'membership', 'Turuturu Stars'],
    canonicalUrl: 'https://turuturustars.co.ke/auth',
    robots: 'index,follow',
  },

  // Dashboard Pages
  DASHBOARD_HOME: {
    title: 'Dashboard - Turuturu Stars CBO',
    description: 'Your personal dashboard for managing contributions, membership, and community activities.',
    keywords: ['dashboard', 'profile', 'membership', 'contributions'],
    robots: 'noindex,follow', // Don't index user dashboards
  },

  PROFILE: {
    title: 'My Profile - Turuturu Stars CBO',
    description: 'Manage your personal profile, contact information, and preferences.',
    keywords: ['profile', 'settings', 'account management'],
    robots: 'noindex,follow',
  },

  CONTRIBUTIONS: {
    title: 'Contributions - Turuturu Stars CBO',
    description: 'Track your contributions and manage pending payments.',
    keywords: ['contributions', 'payments', 'financial', 'membership fees'],
    robots: 'noindex,follow',
  },

  WELFARE: {
    title: 'Welfare Assistance - Turuturu Stars CBO',
    description: 'Request and track welfare assistance from the community fund.',
    keywords: ['welfare', 'assistance', 'emergency fund', 'community support'],
    robots: 'noindex,follow',
  },

  ANNOUNCEMENTS: {
    title: 'Community Announcements - Turuturu Stars CBO',
    description: 'Stay updated with the latest announcements from your community.',
    keywords: ['announcements', 'news', 'updates', 'events'],
    robots: 'index,follow',
  },

  MEMBERS: {
    title: 'Community Members - Turuturu Stars CBO',
    description: 'Browse and connect with other community members.',
    keywords: ['members', 'directory', 'community', 'networking'],
    robots: 'index,follow',
  },

  APPROVALS: {
    title: 'Member Approvals - Turuturu Stars CBO',
    description: 'Review and approve new member applications.',
    keywords: ['approvals', 'members', 'verification', 'onboarding'],
    robots: 'noindex,follow',
  },

  ALL_CONTRIBUTIONS: {
    title: 'All Contributions - Turuturu Stars CBO',
    description: 'View comprehensive contribution records and financial reports.',
    keywords: ['contributions', 'financial', 'reports', 'accounting'],
    robots: 'noindex,follow',
  },

  // Role-specific Dashboards
  CHAIRPERSON: {
    title: 'Chairperson Dashboard - Turuturu Stars CBO',
    description: 'Leadership dashboard with organization overview and key metrics.',
    keywords: ['leadership', 'dashboard', 'organization', 'reports'],
    robots: 'noindex,follow',
  },

  VICE_CHAIRMAN: {
    title: 'Vice Chairman Dashboard - Turuturu Stars CBO',
    description: 'Vice chairman dashboard for organizational oversight.',
    keywords: ['vice chairman', 'leadership', 'oversight'],
    robots: 'noindex,follow',
  },

  SECRETARY: {
    title: 'Secretary Dashboard - Turuturu Stars CBO',
    description: 'Secretary dashboard for documentation and communication management.',
    keywords: ['secretary', 'documentation', 'minutes', 'records'],
    robots: 'noindex,follow',
  },

  TREASURER: {
    title: 'Treasurer Dashboard - Turuturu Stars CBO',
    description: 'Financial management dashboard with accounting and reporting tools.',
    keywords: ['treasurer', 'finance', 'accounting', 'reports'],
    robots: 'noindex,follow',
  },

  ORGANIZING_SECRETARY: {
    title: 'Organizing Secretary Dashboard - Turuturu Stars CBO',
    description: 'Event and activity planning dashboard.',
    keywords: ['organizing secretary', 'events', 'activities', 'planning'],
    robots: 'noindex,follow',
  },

  PATRON: {
    title: 'Patron Dashboard - Turuturu Stars CBO',
    description: 'Patron oversight and mentorship dashboard.',
    keywords: ['patron', 'mentorship', 'guidance'],
    robots: 'noindex,follow',
  },

  ADMIN: {
    title: 'Admin Panel - Turuturu Stars CBO',
    description: 'System administration and configuration panel.',
    keywords: ['admin', 'administration', 'system', 'management'],
    robots: 'noindex,follow',
  },

  // Error Pages
  NOT_FOUND: {
    title: '404 - Page Not Found - Turuturu Stars CBO',
    description: 'The page you are looking for could not be found.',
    keywords: ['404', 'error', 'page not found'],
    noindex: true,
  },
};

/**
 * Get metadata for a specific page
 * Falls back to reasonable defaults if page not found
 */
export const getPageMetadata = (pageKey: string): PageMetaData => {
  return (
    PAGE_METADATA[pageKey] || {
      title: 'Turuturu Stars CBO',
      description: 'Community Based Organization Management Platform',
      keywords: ['CBO', 'community', 'organization'],
    }
  );
};
