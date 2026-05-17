import { useEffect, useState } from 'react';
import { ChevronUp, Home, Info, Target, Briefcase, Users } from 'lucide-react';

const sections = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'about', label: 'About', icon: Info },
  { id: 'pillars', label: 'Pillars', icon: Target },
  { id: 'leadership', label: 'Leadership', icon: Users },
  { id: 'careers', label: 'Jobs', icon: Briefcase },
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

  return (
    <>
      <div className="fixed left-0 top-0 z-50 h-[3px] w-full bg-black/10">
        <div
          className="h-full bg-[#f1c762] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {progress > 2 && (
        <div
          className={`fixed bottom-5 right-5 z-40 hidden transition-all duration-300 md:block ${
            showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          } ${isScrolling ? '' : 'opacity-80'}`}
          aria-hidden={false}
        >
          <button
            onClick={scrollToTop}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white/90 text-[#0a314d] shadow-sm backdrop-blur transition hover:border-[#0a314d]"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 lg:right-6 md:flex">
        <div className="relative flex flex-col gap-2 border-r border-white/40 pr-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="group relative flex items-center justify-end gap-2"
                aria-label={`Navigate to ${section.label}`}
              >
                <span className={`pointer-events-none rounded bg-[#061c2c]/92 px-2 py-1 text-xs font-bold text-white shadow-sm transition-all duration-200 ${
                  isActive ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                }`}>
                  {section.label}
                </span>
                <span className={`relative flex h-9 w-9 items-center justify-center rounded-md border transition-all duration-200 ${
                  isActive 
                    ? 'border-[#f1c762] bg-[#f1c762] text-[#061c2c] shadow-sm' 
                    : 'border-white/35 bg-white/80 text-[#526274] backdrop-blur hover:border-[#f1c762] hover:text-[#061c2c]'
                }`}>
                  <Icon className={`w-4 h-4 lg:w-5 lg:h-5 transition-colors duration-300 ${
                    isActive ? 'text-[#061c2c]' : ''
                  }`} />
                </span>
                {isActive && (
                  <span className="absolute -right-[11px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#f1c762]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl md:hidden">
        <div className="safe-area-bottom flex items-center justify-around px-2 py-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="relative flex min-w-[58px] flex-col items-center justify-center gap-1 px-2 py-2 transition-all duration-200"
              >
                <div className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#f1c762] text-[#061c2c]' 
                    : 'bg-transparent'
                }`}>
                  <Icon className={`h-5 w-5 transition-colors duration-200 ${
                    isActive ? 'text-[#061c2c]' : 'text-gray-600'
                  }`} />
                </div>

                <span className={`text-[10px] font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'text-[#061c2c]' 
                    : 'text-gray-500'
                }`}>
                  {section.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
};

export default ScrollProgressIndicator;
