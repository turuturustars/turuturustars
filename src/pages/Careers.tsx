import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import CareersSection from '@/components/pages/careers/CareersSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Careers = () => {
  usePageMeta({
    title: 'Community Jobs - Turuturu Stars',
    description: 'Explore verified job listings from government and trusted job sites, with Murang’a and casual jobs prioritized.',
    keywords: [
      'careers',
      'jobs',
      'employment',
      'opportunities',
      'community jobs',
      'Murang’a jobs',
      'casual jobs',
      'Turuturu Stars'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/careers',
  });

  const organizationData = {
    name: 'Turuturu Stars CBO',
    description: 'Community jobs board with verified listings from external sources.',
    url: 'https://turuturustars.co.ke/careers',
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={organizationData} type="Organization" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <CareersSection />
      </main>
      <Footer />
    </div>
  );
};

export default Careers;
