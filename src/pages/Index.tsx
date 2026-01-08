import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import PillarsSection from '@/components/PillarsSection';
import GallerySection from '@/components/GallerySection';
import ChairmanSection from '@/components/ChairmanSection';
import MembershipForm from '@/components/MembershipForm';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <PillarsSection />
        <GallerySection />
        <ChairmanSection />
        <MembershipForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
