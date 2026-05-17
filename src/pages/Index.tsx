import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/pages/about/AboutSection';
import PillarsSection from '@/components/pages/pillars/PillarsSection';
import ChairmanSection from '@/components/pages/leadership/ChairmanSection';
import CareersSection from '@/components/pages/careers/CareersSection';
import Footer from '@/components/Footer';
import { StructuredData, LocalOrganizationSchema } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';

const Index = () => {
  usePageMeta({
    title: "Turuturu Stars CBO - Murang'a Community Support & Kenya Jobs",
    description:
      "Turuturu Stars CBO serves Turuturu, Murang'a County with welfare support, community programs, and verified Kenya jobs including government, public, casual, and Murang'a jobs.",
    keywords: [
      'Turuturu Stars',
      'CBO Kenya',
      'community based organization',
      'community organization',
      'Turuturu community',
      'Muranga CBO',
      'Turuturu Muranga',
      'Githima community',
      'Kigumo community',
      'welfare assistance Kenya',
      'community contributions',
      'mutual help Kenya',
      'Turuturu projects',
      'Turuturu support',
      'Turuturu good will community',
      'Francis Mwangi chairman',
      'Peter Muraya Turuturu',
      'Turuturu Baptist Church',
      'Turuturu KAG Church',
      'Turuturu PEFA Church',
      'Akorino church Turuturu',
      'Bishop Kinyua',
      'Turuturu primary school',
      'Turuturu secondary school',
      'Kigumo secondary school',
      'Kigumo bendera high school',
      'Turuturu well wishers',
      'turuturu community welfare',
      'jobs in Kenya',
      'Government of Kenya jobs',
      'government jobs Kenya',
      'public jobs Kenya',
      "Murang'a jobs",
      'Muranga jobs',
      'casual jobs Kenya',
      'county government jobs',
    ],
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
    canonicalUrl: 'https://turuturustars.co.ke',
  });

  const organizationData = {
    name: 'Turuturu Stars CBO',
    url: 'https://turuturustars.co.ke',
    description:
      "Community Based Organization managing contributions, welfare, member engagement, and verified job opportunities in Murang'a County",
    foundingDate: '2024',
    location: {
      '@type': 'Place',
      name: 'Turuturu, Muranga County, Kenya'
    },
    logo: 'https://img.icons8.com/nolan/256/star.png',
    sameAs: [
      'https://www.facebook.com/profile.php?id=61586034996115',
      'https://chat.whatsapp.com/GGTZMqkT2akLenI23wWrN7'
    ]
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={organizationData} type="Organization" />
      <LocalOrganizationSchema />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <HeroSection />
        <AboutSection />
        <PillarsSection />
        <ChairmanSection />
        <CareersSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

