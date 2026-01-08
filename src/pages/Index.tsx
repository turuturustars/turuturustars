import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import PillarsSection from '@/components/PillarsSection';
import ChairmanSection from '@/components/ChairmanSection';
import JoinSection from '@/components/JoinSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <PillarsSection />
        <ChairmanSection />
        <JoinSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
