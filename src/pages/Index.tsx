import { useEffect } from 'react';
import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import PillarsSection from '@/components/PillarsSection';
import ChairmanSection from '@/components/ChairmanSection';
import MembershipForm from '@/components/MembershipForm';
import CareersSection from '@/components/CareersSection';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Index = () => {
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
        <AboutSection />
        <PillarsSection />
        <ChairmanSection />
        <CareersSection />
        <MembershipForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

