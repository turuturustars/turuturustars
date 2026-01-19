/**
 * SEO Utilities & Helpers
 * Advanced SEO functions for schema generation, meta tag management, and optimization
 */

/**
 * Generate FAQ Schema for FAQ pages
 */
export const generateFAQSchema = (faqs: Array<{ question: string; answer: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
};

/**
 * Generate Breadcrumb Schema for navigation
 */
export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url
    }))
  };
};

/**
 * Generate Event Schema for meetings and events
 */
export const generateEventSchema = (event: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  image?: string;
  organizer?: string;
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    'name': event.name,
    'description': event.description,
    'startDate': event.startDate,
    ...(event.endDate && { 'endDate': event.endDate }),
    ...(event.location && {
      'location': {
        '@type': 'Place',
        'name': event.location
      }
    }),
    ...(event.image && { 'image': event.image }),
    ...(event.organizer && {
      'organizer': {
        '@type': 'Organization',
        'name': event.organizer
      }
    })
  };
};

/**
 * Generate Organization Schema
 */
export const generateOrganizationSchema = (org: {
  name: string;
  description: string;
  url: string;
  logo: string;
  email: string;
  phone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  socialProfiles?: string[];
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': org.name,
    'description': org.description,
    'url': org.url,
    'logo': org.logo,
    'email': org.email,
    ...(org.phone && { 'telephone': org.phone }),
    ...(org.address && { 'address': org.address }),
    ...(org.socialProfiles && org.socialProfiles.length > 0 && {
      'sameAs': org.socialProfiles
    })
  };
};

/**
 * Generate Local Business Schema
 */
export const generateLocalBusinessSchema = (business: {
  name: string;
  description: string;
  url: string;
  logo: string;
  email: string;
  phone: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  areaServed: string[];
  socialProfiles?: string[];
  priceRange?: string;
  openingHours?: {
    dayOfWeek: string;
    opens: string;
    closes: string;
  }[];
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': business.name,
    'description': business.description,
    'url': business.url,
    'logo': business.logo,
    'email': business.email,
    'telephone': business.phone,
    'address': {
      '@type': 'PostalAddress',
      ...business.address
    },
    'areaServed': business.areaServed.map(area => ({
      '@type': 'Place',
      'name': area
    })),
    ...(business.socialProfiles && business.socialProfiles.length > 0 && {
      'sameAs': business.socialProfiles
    }),
    ...(business.priceRange && { 'priceRange': business.priceRange }),
    ...(business.openingHours && business.openingHours.length > 0 && {
      'openingHoursSpecification': business.openingHours.map(hours => ({
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': hours.dayOfWeek,
        'opens': hours.opens,
        'closes': hours.closes
      }))
    })
  };
};

/**
 * Generate Article/NewsArticle Schema
 */
export const generateArticleSchema = (article: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  organizationName?: string;
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': article.headline,
    'description': article.description,
    'image': article.image,
    'datePublished': article.datePublished,
    ...(article.dateModified && { 'dateModified': article.dateModified }),
    ...(article.author && {
      'author': {
        '@type': 'Person',
        'name': article.author
      }
    }),
    ...(article.organizationName && {
      'publisher': {
        '@type': 'Organization',
        'name': article.organizationName,
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://img.icons8.com/nolan/256/star.png'
        }
      }
    })
  };
};

/**
 * Optimize meta description length
 */
export const optimizeMetaDescription = (description: string, maxLength: number = 160): string => {
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength - 3) + '...';
};

/**
 * Generate meta keywords from array
 */
export const generateKeywords = (keywords: string[]): string => {
  // Remove duplicates and limit to 50 keywords for best practice
  const uniqueKeywords = [...new Set(keywords)].slice(0, 50);
  return uniqueKeywords.join(', ');
};

/**
 * Check if meta tags are SEO optimized
 */
export const checkSEOOptimization = (metadata: {
  title: string;
  description: string;
  keywords?: string;
}): { score: number; issues: string[] } => {
  const issues: string[] = [];
  let score = 100;

  // Check title length (50-60 characters optimal)
  if (metadata.title.length < 30) {
    issues.push('Title too short (< 30 chars)');
    score -= 10;
  } else if (metadata.title.length > 70) {
    issues.push('Title too long (> 70 chars)');
    score -= 10;
  }

  // Check description length (150-160 characters optimal)
  if (metadata.description.length < 120) {
    issues.push('Description too short (< 120 chars)');
    score -= 10;
  } else if (metadata.description.length > 165) {
    issues.push('Description too long (> 165 chars)');
    score -= 10;
  }

  // Check for keywords
  if (!metadata.keywords || metadata.keywords.length === 0) {
    issues.push('No keywords provided');
    score -= 15;
  }

  // Check for keyword in title
  if (metadata.keywords && !metadata.title.toLowerCase().includes(metadata.keywords.split(',')[0].trim().toLowerCase())) {
    issues.push('Primary keyword not in title');
    score -= 5;
  }

  return { score: Math.max(0, score), issues };
};

/**
 * Generate Open Graph tags object
 */
export const generateOGTags = (og: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: 'website' | 'article' | 'profile';
  siteName?: string;
  locale?: string;
}) => {
  return {
    'og:title': og.title,
    'og:description': og.description,
    'og:image': og.image,
    'og:url': og.url,
    'og:type': og.type || 'website',
    ...(og.siteName && { 'og:site_name': og.siteName }),
    ...(og.locale && { 'og:locale': og.locale }),
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': og.title
  };
};

/**
 * Generate Twitter Card tags object
 */
export const generateTwitterTags = (twitter: {
  title: string;
  description: string;
  image: string;
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  handle?: string;
  creator?: string;
}) => {
  return {
    'twitter:card': twitter.card || 'summary_large_image',
    'twitter:title': twitter.title,
    'twitter:description': twitter.description,
    'twitter:image': twitter.image,
    'twitter:image:alt': twitter.title,
    ...(twitter.handle && { 'twitter:site': twitter.handle }),
    ...(twitter.creator && { 'twitter:creator': twitter.creator })
  };
};

/**
 * Generate canonical URL
 */
export const generateCanonicalURL = (baseURL: string, path: string): string => {
  const url = new URL(path, baseURL);
  // Remove trailing slashes except for root
  const pathname = url.pathname;
  if (pathname !== '/' && pathname.endsWith('/')) {
    url.pathname = pathname.slice(0, -1);
  }
  return url.toString();
};

/**
 * Check if URL is mobile-friendly format
 */
export const isMobileFriendly = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Generate hreflang tags for multilingual content
 */
export const generateHrefLang = (languages: Array<{ lang: string; url: string }>) => {
  return languages.map(item => ({
    'hreflang': item.lang,
    'href': item.url
  }));
};

/**
 * Validate structured data JSON
 */
export const validateStructuredData = (jsonLd: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!jsonLd['@context']) {
    errors.push('Missing @context property');
  }

  if (!jsonLd['@type']) {
    errors.push('Missing @type property');
  }

  if (typeof jsonLd !== 'object') {
    errors.push('Structured data must be an object');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate robots meta tag value
 */
export const generateRobotsMeta = (options: {
  index: boolean;
  follow: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: 'none' | 'standard' | 'large';
  maxVideoPreview?: number;
}): string => {
  const parts = [];

  parts.push(options.index ? 'index' : 'noindex');
  parts.push(options.follow ? 'follow' : 'nofollow');

  if (options.noarchive) parts.push('noarchive');
  if (options.nosnippet) parts.push('nosnippet');
  if (options.maxSnippet) parts.push(`max-snippet:${options.maxSnippet}`);
  if (options.maxImagePreview) parts.push(`max-image-preview:${options.maxImagePreview}`);
  if (options.maxVideoPreview) parts.push(`max-video-preview:${options.maxVideoPreview}`);

  return parts.join(',');
};

/**
 * Generate JSON-LD script tag
 */
export const createJSONLDScript = (jsonLd: any): HTMLScriptElement => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  return script;
};

/**
 * Extract primary keyword from list
 */
export const getPrimaryKeyword = (keywords: string[]): string => {
  return keywords[0] || '';
};

/**
 * Calculate keyword density
 */
export const calculateKeywordDensity = (text: string, keyword: string): number => {
  const words = text.toLowerCase().split(/\s+/);
  const keywordCount = words.filter(word => word.includes(keyword.toLowerCase())).length;
  return (keywordCount / words.length) * 100;
};

/**
 * SEO Score Calculator
 */
export const calculateSEOScore = (data: {
  titleOptimized: boolean;
  descriptionOptimized: boolean;
  h1Present: boolean;
  imageAltTexts: boolean;
  internalLinks: number;
  mobileOptimized: boolean;
  structuredData: boolean;
  pageSpeed: number; // 0-100
}): number => {
  let score = 0;

  score += data.titleOptimized ? 10 : 0;
  score += data.descriptionOptimized ? 10 : 0;
  score += data.h1Present ? 10 : 0;
  score += data.imageAltTexts ? 10 : 0;
  score += Math.min(data.internalLinks, 5) * 2; // Max 10 points
  score += data.mobileOptimized ? 10 : 0;
  score += data.structuredData ? 15 : 0;
  score += Math.round(data.pageSpeed / 10); // Max 10 points

  return Math.min(score, 100);
};
