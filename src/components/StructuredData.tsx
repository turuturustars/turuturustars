import { FC, useEffect } from 'react';

interface StructuredDataProps {
  data: Record<string, any>;
  type?: string;
}

/**
 * Component to inject structured data (JSON-LD) into page head
 * Helps search engines understand page content
 */
export const StructuredData: FC<StructuredDataProps> = ({ data, type = 'Organization' }) => {
  useEffect(() => {
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
  }, [data, type]);

  return null;
};

/**
 * Component for breadcrumb navigation and structured data
 * Improves SEO and user navigation
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbStructuredData: FC<BreadcrumbProps> = ({ items }) => {
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.url, window.location.origin).href,
    })),
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbList);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [items]);

  return null;
};
