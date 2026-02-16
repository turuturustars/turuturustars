import { ArrowRight, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

import galleryMembers from '@/assets/gallery-members.png';
import veronikaEvent from '@/assets/turuturu_stars_community_togther_with_senator_veronica_maina.jpg';
import prizeGivingDay from '@/assets/turuturustars_community_during_prize_giving_day.jpg';
import bestStudents from '@/assets/best_students_with_student_motivation_team.jpg';
import logo from '@/assets/turuturustarslogo.png';

const HERO_IMAGES = [
  galleryMembers,
  veronikaEvent,
  prizeGivingDay,
  bestStudents,
];

const HeroSection = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    HERO_IMAGES.forEach((image) => {
      const preloadImage = new Image();
      preloadImage.src = image;
    });
  }, []);

  useEffect(() => {
    if (isReducedMotion) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((currentIndex) => (currentIndex + 1) % HERO_IMAGES.length);
    }, 9000);

    return () => window.clearInterval(intervalId);
  }, [isReducedMotion]);

  return (
    <section id="home" className="hero-shell">
      <div className="hero-backdrop" aria-hidden="true" />
      <div className="hero-glow hero-glow-left" aria-hidden="true" />
      <div className="hero-glow hero-glow-right" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-copy">
          <div className="hero-brand">
            <img src={logo} alt="Turuturu Stars logo" className="hero-brand-logo" loading="eager" />
            <span>Turuturu Stars CBO</span>
          </div>

          <h1>Community first. Progress together.</h1>
          <p>
            Membership, contributions, and welfare in one trusted space built for local families.
          </p>

          <div className="hero-actions">
            <Button asChild size="lg" className="hero-primary-button">
              <Link to="/auth">
                Get started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="hero-secondary-button">
              <Link to="/donate">
                Donate
                <HeartHandshake className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <p className="hero-footnote">
            Serving Turuturu, Githima, Kigumo, and nearby communities.
          </p>
        </div>

        <div className="hero-media-shell">
          <img
            key={activeImageIndex}
            src={HERO_IMAGES[activeImageIndex]}
            alt="Turuturu Stars community program"
            className={`hero-media ${isReducedMotion ? '' : 'hero-media-fade'}`}
            loading="eager"
          />
          <p className="hero-media-caption">
            Real moments from member activities and support programs.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
