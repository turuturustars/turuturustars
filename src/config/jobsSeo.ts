export type JobsPageVariant = 'all' | 'government' | 'public' | 'muranga';

type JobsPageSeo = {
  title: string;
  description: string;
  keywords: string[];
  canonicalPath: string;
  eyebrow: string;
  heading: string;
  intro: string;
  searchPlaceholder: string;
  defaultFilters?: {
    onlyGovernment?: boolean;
    onlyMuranga?: boolean;
    onlyCasual?: boolean;
  };
};

export const JOBS_BASE_URL = 'https://turuturustars.co.ke';

export const JOB_SEARCH_LINKS: Array<{
  label: string;
  href: string;
  description: string;
}> = [
  {
    label: 'All Kenya jobs',
    href: '/jobs',
    description: 'Verified jobs from trusted Kenyan sources.',
  },
  {
    label: 'Government of Kenya jobs',
    href: '/government-jobs',
    description: 'National and county government openings.',
  },
  {
    label: 'Public jobs in Kenya',
    href: '/public-jobs',
    description: 'Public service, county, and state opportunities.',
  },
  {
    label: "Murang'a jobs",
    href: '/muranga-jobs',
    description: "Local jobs in Murang'a County and nearby areas.",
  },
];

export const JOBS_PAGE_SEO: Record<JobsPageVariant, JobsPageSeo> = {
  all: {
    title: "Jobs in Kenya, Government & Murang'a Jobs | Turuturu Stars",
    description:
      "Find verified jobs in Kenya, including Government of Kenya jobs, public sector opportunities, county jobs, casual work, and Murang'a jobs.",
    canonicalPath: '/jobs',
    eyebrow: 'Verified Kenya Jobs Board',
    heading: "Kenya Jobs, Government Jobs and Murang'a Opportunities",
    intro:
      "Search verified job opportunities from trusted Kenyan sources, with Government of Kenya jobs, public jobs, county jobs, casual work, and Murang'a openings kept easy to find.",
    searchPlaceholder: 'Search Government of Kenya jobs, Murang\'a jobs, public jobs...',
    keywords: [
      'jobs in Kenya',
      'Kenya jobs',
      'job search Kenya',
      'Government of Kenya jobs',
      'government jobs Kenya',
      'public jobs Kenya',
      'county government jobs',
      "Murang'a jobs",
      'Muranga jobs',
      'casual jobs Kenya',
      'Turuturu jobs',
      'Kigumo jobs',
      'Githima jobs',
      'public service jobs Kenya',
      'latest jobs Kenya',
    ],
  },
  government: {
    title: 'Government of Kenya Jobs | Turuturu Stars Jobs Board',
    description:
      'Browse Government of Kenya jobs, county government openings, public service vacancies, and verified application links collected for the community.',
    canonicalPath: '/government-jobs',
    eyebrow: 'Government Jobs Kenya',
    heading: 'Government of Kenya Jobs and County Opportunities',
    intro:
      "Find national government jobs, county government vacancies, and public service opportunities from verified sources, with Murang'a County roles highlighted for local job seekers.",
    searchPlaceholder: 'Search ministries, counties, public service jobs...',
    defaultFilters: {
      onlyGovernment: true,
    },
    keywords: [
      'Government of Kenya jobs',
      'government jobs Kenya',
      'national government jobs Kenya',
      'county government jobs Kenya',
      'public service jobs Kenya',
      'PSC jobs Kenya',
      "Murang'a county jobs",
      'county jobs Muranga',
      'Kenya public jobs',
      'government vacancies Kenya',
    ],
  },
  public: {
    title: 'Public Jobs in Kenya | County & Government Jobs',
    description:
      "Search public jobs in Kenya from county government, national government, public service, and trusted employment sources, with Murang'a roles highlighted.",
    canonicalPath: '/public-jobs',
    eyebrow: 'Public Sector Jobs',
    heading: 'Public Jobs in Kenya and County Government Vacancies',
    intro:
      "Browse public jobs in Kenya from county government, national government, public service bodies, and other trusted sources serving Murang'a and the wider Kenyan job market.",
    searchPlaceholder: 'Search public jobs, county jobs, government jobs...',
    defaultFilters: {
      onlyGovernment: true,
    },
    keywords: [
      'public jobs Kenya',
      'public service jobs Kenya',
      'public sector jobs Kenya',
      'county government jobs',
      'Government of Kenya jobs',
      'Kenya government vacancies',
      "Murang'a public jobs",
      'state jobs Kenya',
      'parastatal jobs Kenya',
    ],
  },
  muranga: {
    title: "Murang'a Jobs | Casual, County & Government Jobs",
    description:
      "Find Murang'a jobs, casual work, county government roles, internships, and verified opportunities near Turuturu, Kigumo, Githima, and Kenya.",
    canonicalPath: '/muranga-jobs',
    eyebrow: "Murang'a Jobs",
    heading: "Murang'a Jobs, Casual Work and County Opportunities",
    intro:
      "Find job opportunities in Murang'a County, including casual jobs, county government openings, public jobs, internships, and work near Turuturu, Kigumo, Githima, and nearby areas.",
    searchPlaceholder: 'Search Murang\'a jobs, casual jobs, county roles...',
    defaultFilters: {
      onlyMuranga: true,
    },
    keywords: [
      "Murang'a jobs",
      'Muranga jobs',
      "jobs in Murang'a",
      'jobs in Muranga',
      "Murang'a county jobs",
      'Muranga county jobs',
      'casual jobs Muranga',
      'Turuturu jobs',
      'Kigumo jobs',
      'Githima jobs',
      'county jobs Muranga',
      'government jobs Muranga',
      'public jobs Muranga',
    ],
  },
};

export const getJobsPageSeo = (variant: JobsPageVariant = 'all') => {
  const seo = JOBS_PAGE_SEO[variant] || JOBS_PAGE_SEO.all;
  return {
    ...seo,
    canonicalUrl: `${JOBS_BASE_URL}${seo.canonicalPath}`,
  };
};
