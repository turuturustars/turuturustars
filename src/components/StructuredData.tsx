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
      script.remove();
    };
  }, [data, type]);

  return null;
};

/**
 * Local Organization Schema with service areas and contact info
 */
export const LocalOrganizationSchema: FC = () => {
  useEffect(() => {
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Turuturu Stars CBO',
      description: 'Community Based Organization providing welfare, contributions, and community support in Muranga County, Kenya',
      url: 'https://turuturustars.co.ke',
      telephone: '+254',
      email: 'support@turuturustars.co.ke',
      areaServed: [
        {
          '@type': 'Place',
          name: 'Turuturu',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Turuturu',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
        {
          '@type': 'Place',
          name: 'Githima',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Githima',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
        {
          '@type': 'Place',
          name: 'Kigumo',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Kigumo',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
        {
          '@type': 'Place',
          name: 'Nguku',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Nguku',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
        {
          '@type': 'Place',
          name: 'Kahariro',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Kahariro',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
        {
          '@type': 'Place',
          name: 'Gatune',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Gatune',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
        {
          '@type': 'Place',
          name: 'Githeru',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Githeru',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
        {
          '@type': 'Place',
          name: 'Duka Moja',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Duka Moja',
            addressRegion: 'Muranga',
            addressCountry: 'KE',
          },
        },
      ],
      sameAs: [
        'https://www.facebook.com/profile.php?id=61586034996115',
        'https://chat.whatsapp.com/GGTZMqkT2akLenI23wWrN7',
      ],
      founder: {
        '@type': 'Person',
        name: 'Francis Mwangi',
        jobTitle: 'Chairman',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        telephone: '+254',
        email: 'support@turuturustars.co.ke',
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(organizationSchema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

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
      item: new URL(item.url, globalThis.location.origin).href,
    })),
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbList);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [items]);

  return null;
};
