import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import './HeroSection.css';

// Community images for background animation
import galleryMembers from '@/assets/gallery-members.png';
import veronikaEvent from '@/assets/turuturu_stars_community_togther_with_senator_veronica_maina.jpg';
import prizeGivingDay from '@/assets/turuturustars_community_during_prize_giving_day.jpg';
import bestStudents from '@/assets/best_students_with_student_motivation_team.jpg';
import motivationTeam from '@/assets/motivation_team_and mentorsip_program.jpg';
import veronica_addressing from '@/assets/veronica_maina_adressing_parents_and_pupils.jpg';
import lowerGradePupils from '@/assets/lower_grade_pupils.jpg';

// Array of community images for background rotation
const HERO_IMAGES = [
  galleryMembers,      // LCP image - preload with high priority
  veronikaEvent,
  prizeGivingDay,
  bestStudents,
  motivationTeam,
  veronica_addressing,
  lowerGradePupils,
];

const HeroSection = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Check for prefers-reduced-motion on mount
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Preload images for better performance
  useEffect(() => {
    HERO_IMAGES.forEach((image) => {
      const img = new Image();
      img.src = image;
      // Add fetchpriority="high" for the first image (LCP optimization)
      if (image === HERO_IMAGES[0]) {
        img.fetchPriority = 'high';
      }
    });
  }, []);

  // Rotate hero image panel for clarity without heavy motion
  useEffect(() => {
    if (isReducedMotion) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isReducedMotion]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen w-full overflow-hidden"
    >
      {/* ANIMATED BACKGROUND LAYER — Ken Burns effect */}
      <div className="absolute inset-0 w-full h-full">
        {/* Animated background images container */}
        <div className="absolute inset-0 w-full h-full">
          {HERO_IMAGES.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
                !isReducedMotion ? 'hero-bg-image' : ''
              }`}
              style={{
                backgroundImage: `url('${image}')`,
                // Stagger animation start for smooth looping
                animationDelay: isReducedMotion ? '0s' : `${index * 8}s`,
                opacity: isReducedMotion && index === 0 ? 1 : 0,
              }}
            />
          ))}
        </div>

        {/* Overlay gradient — warm, soft, readable */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A3D62]/75 via-[#0A3D62]/55 to-[#0A3D62]/40" />

        {/* Additional subtle overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A3D62]/15 via-transparent to-[#0A3D62]/30" />

        {/* Vignette effect for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,61,98,0.25)_100%)]" />
      </div>

      {/* FOREGROUND CONTENT — minimal, focused, accessible */}
      <div className="relative z-20 mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
          {/* Main headline */}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-6 drop-shadow-lg">
            Turuturu is Home.
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl lg:text-2xl text-blue-50 leading-relaxed mb-8 drop-shadow-md max-w-xl mx-auto lg:mx-0">
            A community where learning, faith, and responsibility grow together — guided by Ubuntu.
          </p>

          {/* CTA and secondary action */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center lg:justify-start">
            <Button
              size="lg"
              onClick={() => scrollToSection('register')}
              className="bg-[#1FB6FF] hover:bg-[#12A8F5] text-[#0A3D62] font-semibold px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 w-full sm:w-auto"
            >
              Join the community
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <button
              onClick={() => scrollToSection('about')}
              className="text-white hover:text-blue-100 underline underline-offset-4 transition-colors duration-300 font-medium"
            >
              Our story
            </button>
          </div>

          {/* Tagline */}
          <p className="text-sm text-blue-100 pt-8 drop-shadow-md">
            Built by the community, for the community — since 2019.
          </p>
        </div>

        <div className="relative">
          <div className="hero-image-frame">
            <img
                src={HERO_IMAGES[currentImageIndex]}
              alt="Turuturu Stars community moments"
              className="hero-image"
              loading="eager"
            />
          </div>
          <div className="mt-3 text-center text-xs text-blue-100/90">
            Community moments across Turuturu, Githima, Kigumo, and nearby areas.
          </div>
        </div>
      </div>

      {/* Reduce-motion fallback: static background image */}
      {isReducedMotion && (
        <style>{`
          .hero-bg-image {
            animation: none !important;
          }
        `}</style>
      )}
    </section>
  );
};

export default HeroSection;
