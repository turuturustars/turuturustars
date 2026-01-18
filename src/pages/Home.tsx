import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Home = () => {
  usePageMeta({
    title: 'Turuturu Stars CBO - Community Based Organization Kenya',
    description: 'Join Turuturu Stars, a vibrant community organization dedicated to mutual help and growth. Manage contributions, welfare assistance, and community events.',
    keywords: [
      'CBO Kenya',
      'community organization',
      'contributions',
      'welfare',
      'membership',
      'Turuturu Stars'
    ],
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke',
  });

  const organizationData = {
    name: 'Turuturu Stars CBO',
    url: 'https://turuturustars.co.ke',
    description: 'Community Based Organization managing contributions, welfare, and member engagement',
    foundingDate: '2024',
    location: {
      '@type': 'Place',
      name: 'Kenya'
    },
    logo: 'https://img.icons8.com/nolan/256/star.png',
    sameAs: [
      'https://twitter.com/TuruturuStars',
      'https://facebook.com/TuruturuStars'
    ]
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={organizationData} type="Organization" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <HeroSection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
