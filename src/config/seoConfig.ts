/**
 * SEO Configuration for Turuturu Stars CBO
 * Contains local business information, keywords, and service areas
 */

export const SEO_CONFIG = {
  // Organization Info
  organization: {
    name: 'Turuturu Stars CBO',
    description: 'Community Based Organization providing welfare, contributions, and community support',
    url: 'https://turuturustars.co.ke',
    email: 'support@turuturustars.co.ke',
    phone: '+254',
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

  // Local Keywords
  keywords: {
    community: [
      'Turuturu community',
      'Turuturu Stars',
      'Turuturu good will community',
      'Turuturu well wishers',
      'Turuturu parents',
      'Turuturu support',
    ],
    services: [
      'Turuturu welfare',
      'Turuturu projects',
      'community welfare',
      'community support',
      'mutual help',
      'emergency assistance',
    ],
    organization: [
      'community based organization',
      'CBO Kenya',
      'Muranga CBO',
      'community organization',
    ],
    local_leaders: [
      'Francis Mwangi Chairman',
      'Peter Muraya',
      'Ndungu Peter Muraya',
      'Bishop Kinyua',
      'Akorino Bishop',
    ],
  },

  // Social Media Links
  socialMedia: {
    facebook: 'https://www.facebook.com/profile.php?id=61586034996115',
    whatsapp: 'https://chat.whatsapp.com/GGTZMqkT2akLenI23wWrN7',
    email: 'support@turuturustars.co.ke',
  },

  // Combined keywords for all pages
  getAllKeywords: () => {
    return [
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
