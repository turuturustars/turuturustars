import { useEffect } from 'react';

export interface PageMetaData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  noindex?: boolean;
  robots?: string;
}

/**
 * Hook to set page meta tags for SEO
 * Each page can declare its own meta data for independence
 */
export const usePageMeta = (metadata: PageMetaData) => {
  useEffect(() => {
    // Set title
    document.title = metadata.title;

    // Helper to set or update meta tag
    const setMetaTag = (name: string, content: string, property = false) => {
      let element = document.querySelector(
        property
          ? `meta[property="${name}"]`
          : `meta[name="${name}"]`
      ) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        if (property) {
          element.setAttribute('property', name);
        } else {
          element.setAttribute('name', name);
        }
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // Set basic meta tags
    setMetaTag('description', metadata.description);
    if (metadata.keywords) {
      setMetaTag('keywords', metadata.keywords.join(', '));
    }

    // Set robots tag
    const robotsContent = metadata.robots || (metadata.noindex ? 'noindex,nofollow' : 'index,follow');
    setMetaTag('robots', robotsContent);

    // Set Open Graph tags
    setMetaTag('og:title', metadata.title, true);
    setMetaTag('og:description', metadata.description, true);
    setMetaTag('og:type', metadata.ogType || 'website', true);
    if (metadata.ogImage) {
      setMetaTag('og:image', metadata.ogImage, true);
    }

    // Set Twitter card tags
    setMetaTag('twitter:card', metadata.twitterCard || 'summary_large_image');
    setMetaTag('twitter:title', metadata.title);
    setMetaTag('twitter:description', metadata.description);
    if (metadata.ogImage) {
      setMetaTag('twitter:image', metadata.ogImage);
    }

    // Set canonical URL if provided
    if (metadata.canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = metadata.canonicalUrl;
    }

    return () => {
      // Optional: Cleanup if needed
    };
  }, [metadata]);
};

/**
 * Helper function to generate structured data for SEO
 */
export const generateStructuredData = (type: string, data: Record<string, any>) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);

  return () => {
    document.head.removeChild(script);
  };
};
