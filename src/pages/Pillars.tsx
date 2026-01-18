import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import PillarsSection from '@/components/pages/pillars/PillarsSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Pillars = () => {
  usePageMeta({
    title: 'Our Pillars - Turuturu Stars CBO',
    description: 'Discover the core pillars that guide Turuturu Stars: Ubuntu, Service, Education, and Heritage.',
    keywords: [
      'pillars',
      'Ubuntu',
      'service',
      'education',
      'heritage',
      'Turuturu Stars'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/pillars',
  });

  const organizationData = {
    name: 'Turuturu Stars CBO',
    description: 'Community Based Organization - Core Pillars',
    url: 'https://turuturustars.co.ke/pillars',
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={organizationData} type="Organization" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <PillarsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pillars;
