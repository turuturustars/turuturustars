import { useEffect, useState } from 'react';
import { ChevronUp, Home, Info, Target, Briefcase, Users, UserPlus } from 'lucide-react';

const sections = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'about', label: 'About Us', icon: Info },
  { id: 'pillars', label: 'Our Pillars', icon: Target },
  { id: 'careers', label: 'Careers', icon: Briefcase },
  { id: 'leadership', label: 'Leadership', icon: Users },
  { id: 'register', label: 'Join Us', icon: UserPlus },
];

const ScrollProgressIndicator = () => {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let ticking = false;
    let scrollTimeout: NodeJS.Timeout;

    const updateScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const totalScroll = scrollHeight - clientHeight;
      const scrollPercentage = (scrollTop / totalScroll) * 100;
      
      setProgress(scrollPercentage);
      setShowScrollTop(scrollTop > 400);
      setIsScrolling(true);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { 
        threshold: 0.3,
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    // Scroll to the top of the page with smooth behavior
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollToProgress = (clientY: number, track: HTMLDivElement) => {
    const rect = track.getBoundingClientRect();
    const clamped = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    const ratio = rect.height ? clamped / rect.height : 0;
    const { scrollHeight, clientHeight } = document.documentElement;
    const maxScroll = scrollHeight - clientHeight;
    window.scrollTo({
      top: maxScroll * ratio,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {/* Top Progress Bar - Multi-layered with glow */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200/50 via-slate-100/50 to-slate-200/50 z-50 backdrop-blur-sm">
        {/* Background track */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-blue-500/5 to-primary/5"></div>
        
        {/* Main progress bar with gradient and glow */}
        <div
          className="relative h-full bg-gradient-to-r from-primary via-blue-500 to-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          
          {/* Glow tip */}
          <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-white/50 to-transparent blur-sm"></div>
        </div>

        {/* Pulsing dot at progress end */}
        {progress > 2 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 transition-all duration-300"
            style={{ left: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75"></div>
            <div className="relative w-full h-full bg-white rounded-full shadow-lg"></div>
          </div>
        )}
      </div>

      {/* Left-edge Scroll Indicator (minimal, always left) */}
      {progress > 2 && (
        <div
          className={`fixed left-2 sm:left-3 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ${
            isScrolling ? 'opacity-100' : 'opacity-70'
          }`}
          aria-hidden={false}
        >
          <div className="relative flex flex-col items-center gap-2">
            {/* Scroll to top button */}
            {showScrollTop && (
              <button
                onClick={scrollToTop}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center text-primary"
                aria-label="Scroll to top"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}

            {/* Progress track */}
            <div
              className="relative h-28 sm:h-32 w-1.5 sm:w-2 rounded-full bg-gray-200/70 overflow-hidden hover:w-2.5 sm:hover:w-3 transition-all duration-200"
              onClick={(event) => scrollToProgress(event.clientY, event.currentTarget)}
              role="button"
              tabIndex={0}
              aria-label="Scroll position"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  scrollToTop();
                }
              }}
            >
              <div
                className="absolute bottom-0 left-0 w-full rounded-full bg-gradient-to-b from-primary to-blue-600 transition-all duration-200"
                style={{ height: `${progress}%` }}
              />
            </div>

            {/* Small percentage label */}
            <span className="hidden sm:block text-[10px] font-semibold text-gray-600">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      )}

      {/* Section Navigation - Desktop & Tablet */}
      <nav className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3 lg:gap-4">
        <div className="relative flex flex-col gap-3 lg:gap-4 p-2 lg:p-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-lg">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="group relative flex items-center justify-end"
                aria-label={`Navigate to ${section.label}`}
              >
                {/* Connection line */}
                {index < sections.length - 1 && (
                  <div className="absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-3 lg:h-4 bg-gradient-to-b from-gray-300 to-transparent"></div>
                )}

                {/* Icon container */}
                <div className={`relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/30 scale-110' 
                    : 'bg-gray-100 hover:bg-gradient-to-br hover:from-primary/10 hover:to-blue-500/10 hover:scale-105'
                }`}>
                  <Icon className={`w-4 h-4 lg:w-5 lg:h-5 transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-gray-600 group-hover:text-primary'
                  }`} />
                  
                  {/* Active indicator pulse */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/30 animate-ping"></div>
                  )}
                </div>

                {/* Tooltip */}
                <div className={`absolute right-full mr-3 lg:mr-4 whitespace-nowrap transition-all duration-300 ${
                  isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                }`}>
                  <div className="relative">
                    <div className="px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg bg-gray-900 text-white text-xs lg:text-sm font-medium shadow-xl">
                      {section.label}
                      
                      {/* Arrow */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                        <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress indicator for active section */}
                {isActive && (
                  <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-blue-600 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="relative flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-all duration-300"
              >
                {/* Active background */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-xl"></div>
                )}

                {/* Icon */}
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/30 scale-110' 
                    : 'bg-transparent'
                }`}>
                  <Icon className={`w-5 h-5 transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>

                {/* Label */}
                <span className={`text-[10px] font-medium transition-all duration-300 ${
                  isActive 
                    ? 'text-primary scale-105' 
                    : 'text-gray-500'
                }`}>
                  {section.label.split(' ')[0]}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full">
                    <div className="absolute inset-0 bg-primary rounded-full animate-ping"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
};

export default ScrollProgressIndicator;
