import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import CareersSection from '@/components/pages/careers/CareersSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Careers = () => {
  usePageMeta({
    title: 'Careers - Join Turuturu Stars CBO Team',
    description: 'Explore career opportunities at Turuturu Stars. Join our team and make a difference in the community.',
    keywords: [
      'careers',
      'jobs',
      'employment',
      'opportunities',
      'join us',
      'Turuturu Stars'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/careers',
  });

  const organizationData = {
    name: 'Turuturu Stars CBO',
    description: 'Community Based Organization - Careers',
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
