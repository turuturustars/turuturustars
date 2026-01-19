/**
 * Advanced SEO Meta Tags Manager
 * Handles all meta tag management, structured data, and SEO optimizations
 */

interface SEOMetaTags {
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterHandle?: string;
  twitterCreator?: string;
  canonicalUrl?: string;
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  robots?: string;
  structuredData?: any;
  hrefLang?: Array<{ lang: string; url: string }>;
  locale?: string;
}

/**
 * Advanced SEO Meta Tags Manager
 * Comprehensive solution for SEO meta tag management
 */
export class SEOMetaTagsManager {
  private baseUrl = 'https://turuturustars.co.ke';
  private siteName = 'Turuturu Stars CBO';
  private twitterHandle = '@TuruturuStars';
  private defaultImage = 'https://img.icons8.com/nolan/512/star.png';

  /**
   * Set all meta tags for a page
   */
  public setMetaTags(tags: SEOMetaTags): void {
    // Title
    this.setTitle(tags.title);

    // Basic meta tags
    this.setMeta('description', tags.description);
    if (tags.keywords && tags.keywords.length > 0) {
      this.setMeta('keywords', tags.keywords.join(', '));
    }

    // Author and date tags
    if (tags.author) {
      this.setMeta('author', tags.author);
    }
    if (tags.publishDate) {
      this.setMeta('article:published_time', tags.publishDate, true);
    }
    if (tags.modifiedDate) {
      this.setMeta('article:modified_time', tags.modifiedDate, true);
    }

    // Robots tag
    this.setMeta('robots', tags.robots || 'index,follow');

    // Canonical URL
    if (tags.canonicalUrl) {
      this.setCanonical(tags.canonicalUrl);
    }

    // Open Graph tags
    this.setOpenGraphTags({
      title: tags.ogTitle || tags.title,
      description: tags.ogDescription || tags.description,
      image: tags.ogImage || this.defaultImage,
      url: tags.ogUrl || this.baseUrl,
      type: tags.ogType || 'website',
      siteName: this.siteName,
      locale: tags.locale || 'en_KE'
    });

    // Twitter Card tags
    this.setTwitterTags({
      title: tags.title,
      description: tags.description,
      image: tags.ogImage || this.defaultImage,
      handle: tags.twitterHandle || this.twitterHandle,
      creator: tags.twitterCreator || this.twitterHandle
    });

    // Structured Data
    if (tags.structuredData) {
      this.setStructuredData(tags.structuredData);
    }

    // hreflang tags
    if (tags.hrefLang && tags.hrefLang.length > 0) {
      this.setHrefLangTags(tags.hrefLang);
    }
  }

  /**
   * Set page title
   */
  private setTitle(title: string): void {
    document.title = title;
  }

  /**
   * Set meta tag
   */
  private setMeta(name: string, content: string, isProperty = false): void {
    let element = document.querySelector(
      isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
    ) as HTMLMetaElement;

    if (!element) {
      element = document.createElement('meta');
      if (isProperty) {
        element.setAttribute('property', name);
      } else {
        element.setAttribute('name', name);
      }
      document.head.appendChild(element);
    }

    element.content = content;
  }

  /**
   * Set canonical URL
   */
  private setCanonical(url: string): void {
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }

    canonical.href = url;
  }

  /**
   * Set Open Graph tags
   */
  private setOpenGraphTags(og: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    siteName: string;
    locale: string;
  }): void {
    this.setMeta('og:title', og.title, true);
    this.setMeta('og:description', og.description, true);
    this.setMeta('og:image', og.image, true);
    this.setMeta('og:image:secure_url', og.image, true);
    this.setMeta('og:image:type', 'image/png', true);
    this.setMeta('og:image:width', '512', true);
    this.setMeta('og:image:height', '512', true);
    this.setMeta('og:image:alt', og.title, true);
    this.setMeta('og:url', og.url, true);
    this.setMeta('og:type', og.type, true);
    this.setMeta('og:site_name', og.siteName, true);
    this.setMeta('og:locale', og.locale, true);
  }

  /**
   * Set Twitter Card tags
   */
  private setTwitterTags(twitter: {
    title: string;
    description: string;
    image: string;
    handle: string;
    creator: string;
  }): void {
    this.setMeta('twitter:card', 'summary_large_image');
    this.setMeta('twitter:site', twitter.handle);
    this.setMeta('twitter:creator', twitter.creator);
    this.setMeta('twitter:title', twitter.title);
    this.setMeta('twitter:description', twitter.description);
    this.setMeta('twitter:image', twitter.image);
    this.setMeta('twitter:image:alt', twitter.title);
  }

  /**
   * Set structured data (JSON-LD)
   */
  private setStructuredData(jsonLd: any): void {
    // Remove existing structured data script
    const existingScript = document.querySelector('script[data-seo-structured-data]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create new script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-structured-data', 'true');
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  /**
   * Set hreflang tags for language alternates
   */
  private setHrefLangTags(alternates: Array<{ lang: string; url: string }>): void {
    // Remove existing hreflang tags
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(tag => tag.remove());

    // Add new hreflang tags
    alternates.forEach(alt => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = alt.lang;
      link.href = alt.url;
      document.head.appendChild(link);
    });
  }

  /**
   * Get SEO meta tags for a page
   */
  public getMetaTags(name: string): string | null {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  /**
   * Get Open Graph tag
   */
  public getOGTag(property: string): string | null {
    const meta = document.querySelector(`meta[property="${property}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  /**
   * Generate SEO report for current page
   */
  public generateSEOReport(): SEOReport {
    const report: SEOReport = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      titleLength: document.title.length,
      titleOptimized: this.isTitleOptimized(document.title),
      description: this.getMetaTags('description') || '',
      descriptionLength: this.getMetaTags('description')?.length || 0,
      descriptionOptimized: this.isDescriptionOptimized(this.getMetaTags('description') || ''),
      h1Count: document.querySelectorAll('h1').length,
      h1Present: document.querySelectorAll('h1').length === 1,
      imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
      internalLinks: document.querySelectorAll('a[href^="/"], a[href^="https://turuturustars.co.ke"]').length,
      externalLinks: document.querySelectorAll('a[href^="http"], a[href^="https"]').length,
      mobileOptimized: this.isMobileOptimized(),
      structuredDataPresent: !!document.querySelector('script[type="application/ld+json"]'),
      canonicalPresent: !!document.querySelector('link[rel="canonical"]'),
      openGraphPresent: !!document.querySelector('meta[property="og:title"]'),
      twitterCardPresent: !!document.querySelector('meta[name="twitter:card"]'),
      robots: this.getMetaTags('robots') || '',
      score: 0
    };

    report.score = this.calculatePageSEOScore(report);

    return report;
  }

  /**
   * Check if title is optimized (50-60 characters)
   */
  private isTitleOptimized(title: string): boolean {
    const length = title.length;
    return length >= 50 && length <= 70;
  }

  /**
   * Check if description is optimized (150-160 characters)
   */
  private isDescriptionOptimized(description: string): boolean {
    const length = description.length;
    return length >= 120 && length <= 160;
  }

  /**
   * Check if page is mobile optimized
   */
  private isMobileOptimized(): boolean {
    const viewport = document.querySelector('meta[name="viewport"]');
    return !!viewport && viewport.getAttribute('content')?.includes('width=device-width') === true;
  }

  /**
   * Calculate SEO score for page
   */
  private calculatePageSEOScore(report: SEOReport): number {
    let score = 0;

    // Title optimization (15 points)
    score += report.titleOptimized ? 15 : 5;

    // Description optimization (15 points)
    score += report.descriptionOptimized ? 15 : 5;

    // H1 tag (10 points)
    score += report.h1Present ? 10 : 0;

    // Image alt texts (10 points)
    score += report.imagesWithoutAlt === 0 ? 10 : Math.max(0, 10 - report.imagesWithoutAlt * 2);

    // Internal links (10 points)
    score += Math.min(report.internalLinks * 2, 10);

    // Mobile optimization (10 points)
    score += report.mobileOptimized ? 10 : 0;

    // Structured data (15 points)
    score += report.structuredDataPresent ? 15 : 0;

    // Canonical URL (5 points)
    score += report.canonicalPresent ? 5 : 0;

    // Open Graph (5 points)
    score += report.openGraphPresent ? 5 : 0;

    // Twitter Card (5 points)
    score += report.twitterCardPresent ? 5 : 0;

    return Math.min(score, 100);
  }
}

export interface SEOReport {
  timestamp: string;
  url: string;
  title: string;
  titleLength: number;
  titleOptimized: boolean;
  description: string;
  descriptionLength: number;
  descriptionOptimized: boolean;
  h1Count: number;
  h1Present: boolean;
  imagesWithoutAlt: number;
  internalLinks: number;
  externalLinks: number;
  mobileOptimized: boolean;
  structuredDataPresent: boolean;
  canonicalPresent: boolean;
  openGraphPresent: boolean;
  twitterCardPresent: boolean;
  robots: string;
  score: number;
}

// Export singleton instance
export const seoManager = new SEOMetaTagsManager();
