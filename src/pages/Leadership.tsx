import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import ChairmanSection from '@/components/pages/leadership/ChairmanSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Leadership = () => {
  usePageMeta({
    title: 'Leadership - Turuturu Stars CBO',
    description: 'Meet the leadership team driving Turuturu Stars vision and mission.',
    keywords: [
      'leadership',
      'team',
      'management',
      'chairman',
      'executives',
      'Turuturu Stars'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/leadership',
  });

  const organizationData = {
    name: 'Turuturu Stars CBO',
    description: 'Community Based Organization - Leadership',
    url: 'https://turuturustars.co.ke/leadership',
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={organizationData} type="Organization" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <ChairmanSection />
      </main>
      <Footer />
    </div>
  );
};

export default Leadership;
