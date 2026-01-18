import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import AboutSection from '@/components/pages/about/AboutSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const About = () => {
  usePageMeta({
    title: 'About Turuturu Stars CBO - Our Mission & Values',
    description: 'Learn about Turuturu Stars, our mission, core values, and commitment to community development based on Ubuntu philosophy.',
    keywords: [
      'about us',
      'mission',
      'values',
      'Ubuntu',
      'community development',
      'Turuturu Stars'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke/about',
  });

  const organizationData = {
    name: 'Turuturu Stars CBO',
    description: 'Community Based Organization managing contributions, welfare, and member engagement',
    url: 'https://turuturustars.co.ke/about',
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={organizationData} type="Organization" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default About;
