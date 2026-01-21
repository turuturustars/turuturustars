/**
 * SEO Configuration for Turuturu Stars CBO
 * Contains local business information, keywords, and service areas
 */

export const SEO_CONFIG = {
  // Organization Info - Turuturu Priority
  organization: {
    name: 'Turuturu Stars CBO',
    description: 'Turuturu Stars is a Community Based Organization in Turuturu, Muranga County, Kenya providing Turuturu welfare, community contributions, and community support services for the Turuturu area',
    url: 'https://turuturustars.co.ke',
    email: 'support@turuturustars.co.ke',
    phone: '+254700471113',
  },

  // Leadership
  leadership: {
    chairman: 'Francis Mwangi',
    members: ['Peter Muraya', 'Bishop Kinyua', 'Ndungu Peter Muraya'],
  },

  // Service Locations (Primary Areas)
  locations: {
    primary: [
      'Turuturu',
      'Muranga',
      'Kenya',
    ],
    secondary: [
      'Githima',
      'Gatune',
      'Githeru',
      'Kigumo',
      'Nguku',
      'Kahariro',
      'Duka Moja',
    ],
  },

  // Local Landmarks
  landmarks: {
    schools: [
      'Turuturu Primary School',
      'Turuturu Secondary School',
      'Turuturu High School',
      'Githima Primary School',
      'Nguku Primary and Secondary School',
      'Kahariro Primary School',
      'Kigumo Secondary School',
      'Kigumo Bendera High School',
      'Kigumo Girls School',
    ],
    churches: [
      'Turuturu Baptist Church',
      'Turuturu KAG Church',
      'Turuturu PEFA Church',
      'Turuturu Akorino Church',
    ],
    landmarks_other: [
      'Kwa Mose',
      'Kwa Bigman',
    ],
  },

  // Local Keywords - Prioritized for Turuturu
  keywords: {
    turuturu_primary: [
      'Turuturu',
      'Turuturu Stars',
      'Turuturu CBO',
      'Turuturu community based organization',
      'Turuturu place',
      'Turuturu Muranga',
      'Turuturu Kenya',
      'Turuturu location',
      'Turuturu area',
      'Turuturu region',
      'Turuturu community',
      'Turuturu organization',
      'Turuturu Stars CBO',
      'in Turuturu',
    ],
    community: [
      'Turuturu community',
      'Turuturu Stars',
      'Turuturu good will community',
      'Turuturu well wishers',
      'Turuturu parents',
      'Turuturu support',
      'Turuturu members',
      'Turuturu organization',
      'Turuturu group',
      'Turuturu people',
      'Turuturu residents',
    ],
    services: [
      'Turuturu welfare',
      'Turuturu projects',
      'Turuturu assistance',
      'community welfare Turuturu',
      'community support Turuturu',
      'mutual help Turuturu',
      'emergency assistance Turuturu',
      'welfare fund Turuturu',
      'contributions Turuturu',
      'Turuturu services',
      'Turuturu aid',
    ],
    organization: [
      'Turuturu community based organization',
      'CBO Kenya',
      'Muranga CBO',
      'community organization Kenya',
      'CBO Muranga County',
      'registered CBO',
      'NGO Turuturu',
    ],
    location_keywords: [
      'Turuturu location',
      'Turuturu place',
      'Turuturu area',
      'Turuturu region',
      'Turuturu town',
      'Turuturu village',
      'in Turuturu',
      'Turuturu Muranga County',
      'Kigumo Division',
      'Muranga Central',
    ],
    local_leaders: [
      'Francis Mwangi Turuturu Chairman',
      'Peter Muraya Turuturu',
      'Ndungu Peter Muraya Turuturu',
      'Bishop Kinyua Turuturu',
      'Akorino Bishop Turuturu',
      'Turuturu leadership',
      'Turuturu officials',
    ],
  },

  // Social Media Links
  socialMedia: {
    facebook: 'https://www.facebook.com/profile.php?id=61586034996115',
    whatsapp: 'https://chat.whatsapp.com/GGTZMqkT2akLenI23wWrN7',
    email: 'support@turuturustars.co.ke',
  },

  // Combined keywords for all pages - Turuturu prioritized
  getAllKeywords: () => {
    return [
      ...SEO_CONFIG.keywords.turuturu_primary,
      ...SEO_CONFIG.keywords.location_keywords,
      ...SEO_CONFIG.keywords.community,
      ...SEO_CONFIG.keywords.services,
      ...SEO_CONFIG.keywords.organization,
      ...SEO_CONFIG.keywords.local_leaders,
      ...SEO_CONFIG.locations.primary,
      ...SEO_CONFIG.locations.secondary,
    ].filter((keyword, index, self) => self.indexOf(keyword) === index);
  },

  // Get all locations
  getAllLocations: () => {
    return [...SEO_CONFIG.locations.primary, ...SEO_CONFIG.locations.secondary];
  },

  // Get all landmarks
  getAllLandmarks: () => {
    return [
      ...SEO_CONFIG.landmarks.schools,
      ...SEO_CONFIG.landmarks.churches,
      ...SEO_CONFIG.landmarks.landmarks_other,
    ].filter((landmark, index, self) => self.indexOf(landmark) === index);
  },
};

/**
 * Generates location-specific SEO data
 * Useful for creating location pages
 */
export const generateLocationSEO = (location: string) => {
  return {
    title: `${location} Community - Turuturu Stars CBO | Welfare & Support Services`,
    description: `Join Turuturu Stars Community in ${location}, Muranga County. Access welfare assistance, savings programs, and community support services.`,
    keywords: [
      `${location} Turuturu`,
      `${location} community`,
      `${location} welfare`,
      `Turuturu ${location}`,
      `community in ${location}`,
      'Turuturu Stars',
      'welfare services',
      'mutual help',
      'community support Kenya',
    ],
  };
};

/**
 * Generates landmark-specific SEO data
 * Useful for location-based search visibility
 */
export const generateLandmarkSEO = (landmark: string, location: string) => {
  return {
    title: `${landmark} Community Support - Turuturu Stars CBO`,
    description: `Community welfare and support services near ${landmark}, ${location}. Join Turuturu Stars for mutual help and development.`,
    keywords: [
      `near ${landmark}`,
      `${landmark} community`,
      `${landmark} ${location}`,
      'Turuturu Stars',
      'welfare services',
      'community support',
    ],
  };
};

/**
 * Service Area Description Template
 */
export const serviceAreaDescription = () => {
  const locations = SEO_CONFIG.getAllLocations();
  return `Turuturu Stars CBO provides community welfare and support services across ${locations.join(', ')}. We serve the Muranga County region with mutual help, contributions management, and emergency assistance.`;
};
