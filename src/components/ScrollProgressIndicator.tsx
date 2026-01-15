import { useEffect, useState } from 'react';

const ScrollProgressIndicator = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (window.scrollY / windowHeight) * 100;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Main progress bar */}
      <div 
        className="fixed top-0 left-0 h-1.5 bg-gradient-to-r from-primary via-blue-400 to-primary z-50 transition-all duration-300 ease-out shadow-lg"
        style={{ width: `${scrollProgress}%` }}
      />
      
      {/* Glow effect */}
      <div 
        className="fixed top-0 left-0 h-1.5 bg-gradient-to-r from-primary/40 via-blue-400/40 to-primary/40 z-40 blur-md"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Scroll percentage indicator - appears on hover */}
      {scrollProgress > 0 && (
        <div className="fixed top-8 right-8 z-40 pointer-events-none">
          <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border border-primary/20 shadow-lg">
              {Math.round(scrollProgress)}%
            </div>
          </div>
        </div>
      )}

      {/* Floating scroll indicator dots for sections */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-6">
        {['home', 'about', 'pillars', 'gallery', 'leadership', 'register'].map((section) => (
          <a
            key={section}
            href={`#${section}`}
            className="group relative"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(section);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <div className="w-3 h-3 rounded-full bg-muted border-2 border-primary group-hover:bg-primary transition-all duration-300 cursor-pointer shadow-soft" />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none capitalize">
              {section}
            </div>
          </a>
        ))}
      </div>
    </>
  );
};

export default ScrollProgressIndicator;
