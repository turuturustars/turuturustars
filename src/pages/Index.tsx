import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import PillarsSection from '@/components/PillarsSection';
import ChairmanSection from '@/components/ChairmanSection';
import MembershipForm from '@/components/MembershipForm';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen scroll-smooth">
      <ScrollProgressIndicator />
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <PillarsSection />
        <ChairmanSection />
        <MembershipForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
