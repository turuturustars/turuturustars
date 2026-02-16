import { ArrowRight, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

import galleryMembers from '@/assets/gallery-members.png';
import veronikaEvent from '@/assets/turuturu_stars_community_togther_with_senator_veronica_maina.jpg';
import prizeGivingDay from '@/assets/turuturustars_community_during_prize_giving_day.jpg';
import bestStudents from '@/assets/best_students_with_student_motivation_team.jpg';

const HERO_SEQUENCE = [
  { image: galleryMembers, word: 'KARIBU' },
  { image: veronikaEvent, word: 'TUJENGE' },
  { image: prizeGivingDay, word: 'TUKUZE' },
  { image: bestStudents, word: 'TURUTURU NI' },
];

const WORD_COLORS = ['#8ed4ff', '#ffd66e', '#ff8a8a', '#8dffcf', '#d5b4ff', '#ffba6c'];

const pickRandomColor = (currentColor: string) => {
  if (WORD_COLORS.length < 2) {
    return WORD_COLORS[0] ?? '#8ed4ff';
  }

  const filteredColors = WORD_COLORS.filter((color) => color !== currentColor);
  const randomIndex = Math.floor(Math.random() * filteredColors.length);
  return filteredColors[randomIndex];
};

const HeroSection = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeWordColor, setActiveWordColor] = useState(WORD_COLORS[0]);

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
    HERO_SEQUENCE.forEach((step) => {
      const preloadImage = new Image();
      preloadImage.src = step.image;
    });
  }, []);

  useEffect(() => {
    if (isReducedMotion) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveStepIndex((currentIndex) => (currentIndex + 1) % HERO_SEQUENCE.length);
      setActiveWordColor((currentColor) => pickRandomColor(currentColor));
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [isReducedMotion]);

  const activeStep = HERO_SEQUENCE[activeStepIndex];

  return (
    <section id="home" className="hero-shell">
      <div className="hero-image-stage" aria-hidden="true">
        <img
          key={activeStepIndex}
          src={activeStep.image}
          alt="Turuturu Stars community activities"
          className={`hero-image-main ${isReducedMotion ? '' : 'hero-image-main-enter'}`}
          loading="eager"
        />
      </div>
      <div className="hero-image-overlay" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-copy">
          <h1 className="hero-rotating-title">
            <span className="hero-word-window">
              <span
                key={activeStepIndex}
                className={`hero-changing-word ${isReducedMotion ? '' : 'hero-changing-word-drop'}`}
                style={{ color: activeWordColor }}
              >
                {activeStep.word}
              </span>
            </span>
            <span className="hero-fixed-word"> NYUMBANI.</span>
          </h1>

          <p className="hero-lead">
            TUJENGE NA TUINUANE.
          </p>

          <div className="hero-actions">
            <Button asChild size="lg" className="hero-primary-button">
              <Link to="/auth">
                Member login
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
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
