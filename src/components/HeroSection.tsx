import { ArrowRight, CalendarDays, HeartHandshake, MapPin, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import './HeroSection.css';

import bestStudents from '@/assets/best_students_with_student_motivation_team.jpg';

const proofPoints = [
  { value: '2019', label: 'Vision began', icon: CalendarDays },
  { value: '2023', label: 'Registered CBO', icon: ShieldCheck },
  { value: '200+', label: 'Members and friends', icon: Users },
];

const HeroSection = () => {
  return (
    <section id="home" className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-media" aria-hidden="true">
        <img
          src={bestStudents}
          alt=""
          className="home-hero-image"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="home-hero-overlay" aria-hidden="true" />

      <div className="home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-hero-kicker">
            <MapPin className="h-4 w-4" />
            Turuturu, Murang'a County
          </p>

          <h1 id="home-hero-title">Turuturu Stars CBO</h1>

          <p className="home-hero-lead">
            Karibu nyumbani. We bring Turuturu families, friends, and well-wishers together
            to support education, welfare, and community development with dignity.
          </p>

          <div className="home-hero-actions" aria-label="Primary actions">
            <Button asChild size="lg" className="hero-primary-button">
              <Link to="/auth">
                Member login
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="hero-secondary-button">
              <Link to="/donate">
                Support our work
                <HeartHandshake className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <p className="home-hero-note">
            Tujenge na tuinane, one contribution, one pupil, one neighbour at a time.
          </p>
        </div>

        <div className="home-hero-caption" aria-label="Current focus">
          <span>Current focus</span>
          <strong>School mentorship, member welfare, and verified local opportunities.</strong>
        </div>
      </div>

      <div className="home-hero-proof" aria-label="Turuturu Stars highlights">
        {proofPoints.map((point) => {
          const Icon = point.icon;
          return (
            <div className="home-hero-proof-item" key={point.label}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <div>
                <strong>{point.value}</strong>
                <span>{point.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HeroSection;
