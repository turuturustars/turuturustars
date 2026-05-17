import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import CareersSection from '@/components/pages/careers/CareersSection';
import Footer from '@/components/Footer';
import { BreadcrumbStructuredData, StructuredData } from '@/components/StructuredData';
import { getJobsPageSeo, type JobsPageVariant } from '@/config/jobsSeo';
import { usePageMeta } from '@/hooks/usePageMeta';

type CareersProps = {
  variant?: JobsPageVariant;
};

const Careers = ({ variant = 'all' }: CareersProps) => {
  const seo = getJobsPageSeo(variant);

  usePageMeta({
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: seo.canonicalUrl,
  });

  const jobsPageData = {
    name: seo.heading,
    description: seo.description,
    url: seo.canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Turuturu Stars CBO',
      url: 'https://turuturustars.co.ke',
    },
    about: [
      'Government of Kenya jobs',
      'Public jobs in Kenya',
      "Murang'a jobs",
      'County government jobs',
      'Casual jobs Kenya',
    ],
    audience: {
      '@type': 'Audience',
      audienceType: 'Kenyan job seekers',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://turuturustars.co.ke/jobs?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={jobsPageData} type="CollectionPage" />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: 'https://turuturustars.co.ke/' },
          { name: 'Jobs', url: seo.canonicalUrl },
        ]}
      />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <CareersSection variant={variant} headingLevel="h1" />
      </main>
      <Footer />
    </div>
  );
};

export default Careers;
