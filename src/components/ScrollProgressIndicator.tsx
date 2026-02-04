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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      {/* Scroll Progress Percentage - Enhanced design */}
      {progress > 5 && (
        <div 
          className={`fixed bottom-20 sm:bottom-6 left-4 sm:right-6 z-40 transition-all duration-500 ${
            isScrolling ? 'scale-110' : 'scale-100'
          }`}
        >
          <button
            onClick={progress >= 95 ? scrollToTop : undefined}
            disabled={progress < 95}
            className="w-full h-full"
            aria-label={progress >= 95 ? "Scroll to top" : "Scroll progress indicator"}
          >
            <div className={`relative group cursor-${progress >= 95 ? 'pointer' : 'default'}`}>
              {/* Enhanced glow effect - more intense at 95% */}
              <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${
                progress >= 95 
                  ? 'bg-gradient-to-br from-primary/50 to-blue-500/50 opacity-100' 
                  : 'bg-gradient-to-br from-primary/30 to-blue-500/30 opacity-0 group-hover:opacity-100'
              }`}></div>
              
              {/* Main container */}
              <div className={`relative flex items-center gap-2 rounded-full backdrop-blur-xl border shadow-lg hover:shadow-xl transition-all duration-300 pl-3 pr-3 py-2 sm:pl-4 sm:pr-4 sm:py-2.5 ${
                progress >= 95
                  ? 'bg-gradient-to-r from-primary to-blue-600 border-primary shadow-xl shadow-primary/40 scale-105'
                  : 'bg-white/90 border-gray-200/50'
              }`}>
                {/* Circular progress ring */}
                <svg className={`w-8 h-8 sm:w-10 sm:h-10 -rotate-90 transition-all duration-300 ${
                  progress >= 95 ? 'drop-shadow-lg' : ''
                }`} viewBox="0 0 36 36">
                  {/* Background circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={progress >= 95 ? 'text-white/30' : 'text-gray-200'}
                  />
                  {/* Progress circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke={progress >= 95 ? '#ffffff' : 'url(#progressGradient)'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${progress}, 100`}
                    className="transition-all duration-300"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                  {/* Percentage text */}
                  <text
                    x="18"
                    y="18"
                    textAnchor="middle"
                    dy="0.3em"
                    className={`text-[8px] sm:text-[9px] font-bold transition-all duration-300 ${
                      progress >= 95 ? 'fill-white' : 'fill-primary'
                    }`}
                  >
                    {Math.round(progress)}
                  </text>
                </svg>
                
                {/* Percentage label - hidden on very small screens */}
                <span className={`hidden sm:inline-block text-xs font-semibold transition-all duration-300 ${
                  progress >= 95 
                    ? 'text-white' 
                    : 'bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent'
                }`}>
                  {Math.round(progress)}%
                </span>

                {/* Top arrow indicator when at 95% */}
                {progress >= 95 && (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-bounce ml-1" />
                )}
              </div>

              {/* Ripple effect on hover at 95% */}
              {progress >= 95 && (
                <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 sm:right-6 z-40 group transition-all duration-500 animate-fadeIn"
          aria-label="Scroll to top"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            
            {/* Button */}
            <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg hover:shadow-xl transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
              <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
            </div>

            {/* Ripple effect on hover */}
            <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          </div>
        </button>
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