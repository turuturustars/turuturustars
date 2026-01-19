import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import AboutSection from '@/components/pages/about/AboutSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const About = () => {
  usePageMeta({
    title: 'About Turuturu Stars CBO - Community Organization in Muranga | Mission & Values',
    description: 'Learn about Turuturu Stars Community Organization serving Turuturu, Muranga County. Our mission, Ubuntu values, and commitment to community welfare in Githima, Kigumo, and surrounding areas.',
    keywords: [
      'about Turuturu Stars',
      'about CBO',
      'Turuturu community mission',
      'Ubuntu philosophy',
      'community development Kenya',
      'Turuturu values',
      'Muranga community organization',
      'Turuturu welfare',
      'community values Kenya',
      'Francis Mwangi Turuturu',
      'Turuturu leaders',
      'community support Muranga',
      'Turuturu projects',
      'Turuturu initiatives',
      'Kigumo Turuturu community',
      'Githima Turuturu'
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
