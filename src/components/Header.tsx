import { useState, useEffect, useRef } from 'react';
import logo from '../assets/turuturustarslogo.png';
import { Menu, X, ChevronRight, Sparkles, Zap } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [activeLink, setActiveLink] = useState('/');
  const [scrollProgress, setScrollProgress] = useState(0);
  const headerRef = useRef(null);
  const particleIdsRef = useRef<string[] | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = (globalThis as any).scrollY > 20;
      setIsScrolled(!!scrolled);

      const winInnerHeight = (globalThis as any).innerHeight || 0;
      const windowHeight = document.documentElement.scrollHeight - winInnerHeight;
      const progress = ((globalThis as any).scrollY / (windowHeight || 1)) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    const handleMouseMove = (e: any) => {
      if (headerRef.current && (globalThis as any).innerWidth >= 1024) {
        const rect = headerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });
      }
    };

    (globalThis as any).addEventListener('scroll', handleScroll, { passive: true });
    (globalThis as any).addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      (globalThis as any).removeEventListener('scroll', handleScroll);
      (globalThis as any).removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const navLinks = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'About', href: '/about', icon: '✨' },
    { label: 'Pillars', href: '/pillars', icon: '🏛️' },
    { label: 'Leadership', href: '/leadership', icon: '👥' },
    { label: 'Careers', href: '/careers', icon: '💼' },
    { label: 'Donate', href: '/donate', icon: '$' },
    { label: 'Register', href: '/register', icon: '📝' },
  ];

  if (!particleIdsRef.current) {
    particleIdsRef.current = Array.from({ length: 8 }, (_, i) => `particle-${i}-${Math.random().toString(36).slice(2,7)}`);
  }

  return (
    <>
      {/* Scroll progress bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 z-[60] transition-all duration-300"
        style={{ 
          width: `${scrollProgress}%`,
          opacity: scrollProgress > 0 ? 1 : 0,
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
        }}
      />

      <header 
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          isScrolled ? 'shadow-xl shadow-blue-500/10' : ''
        }`}
        style={{
          background: isScrolled 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.88) 100%)',
          backdropFilter: isScrolled ? 'blur(32px) saturate(200%)' : 'blur(24px) saturate(180%)',
          borderBottom: 'none',
        }}
      >
        {/* Dynamic gradient mesh */}
        <div className="absolute inset-0 opacity-0 lg:opacity-100 pointer-events-none overflow-hidden">
          <div 
            className="absolute w-[800px] h-[800px] rounded-full transition-all duration-1000 ease-out"
            style={{
              background: `radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)`,
              left: `${mousePos.x}%`,
              top: `${mousePos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div 
            className="absolute w-[600px] h-[600px] rounded-full transition-all duration-700 ease-out"
            style={{
              background: `radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)`,
              left: `${mousePos.x + 10}%`,
              top: `${mousePos.y - 10}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particleIdsRef.current.map((id, i) => (
            <div
              key={id}
              className="absolute rounded-full"
              style={{
                width: `${3 + i}px`,
                height: `${3 + i}px`,
                background: `linear-gradient(135deg, rgba(59, 130, 246, ${0.3 - i * 0.03}), rgba(6, 182, 212, ${0.2 - i * 0.02}))`,
                left: `${10 + i * 12}%`,
                top: `${30 + (i % 3) * 20}%`,
                animation: `particleFloat ${5 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                filter: 'blur(1px)',
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[4.5rem] lg:h-20">
            {/* Logo Section */}
            <a 
              href="/" 
              className="flex items-center gap-2 sm:gap-3 group relative z-10 flex-shrink-0"
            >
              <div className="relative">
                <img
                  src={logo}
                  alt="Turuturu Stars Logo"
                  className="h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 object-contain transform group-hover:scale-105 transition-all duration-300"
                />
              </div>
              
              {/* Brand text */}
              <div className="hidden xs:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg lg:text-xl font-semibold bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:via-cyan-600 group-hover:to-blue-600 transition-all duration-700 tracking-tight">
                    Turuturu Stars
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
                <div className="flex items-center gap-1.5 -mt-0.5">
                  <div className="text-[10px] sm:text-xs font-semibold tracking-[0.15em] text-transparent bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text group-hover:from-blue-600 group-hover:to-cyan-600 transition-all duration-500">
                    CBO
                  </div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
              {navLinks.map((link, index) => {
                const isActive = activeLink === link.href;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setActiveLink(link.href)}
                    className="relative group px-3.5 xl:px-4 py-2.5 text-[13px] xl:text-sm font-medium transition-all duration-500 rounded-xl"
                    style={{ 
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    {/* Background layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-blue-50 to-cyan-50/0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 scale-95 group-hover:scale-100" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-cyan-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    
                    <span className={`relative z-10 flex items-center gap-2 transition-all duration-300 ${
                      isActive ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'
                    }`}>
                      <span className="text-base opacity-70 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-110 inline-block">{link.icon}</span>
                      <span>{link.label}</span>
                    </span>
                    
                    {/* Animated underline with gradient */}
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 transition-all duration-500 ${
                      isActive ? 'w-full opacity-100 shadow-lg shadow-blue-500/50' : 'w-0 opacity-0 group-hover:w-4/5 group-hover:opacity-100'
                    }`} />
                    
                    {/* Glow effect */}
                    <div className={`absolute inset-0 bg-blue-500/10 rounded-xl blur-xl transition-all duration-700 ${
                      isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                    }`} />

                    {/* Top shine */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
                  </a>
                );
              })}
            </nav>

            {/* CTA Button - Desktop */}
            <div className="hidden lg:block flex-shrink-0">
              <a href="/auth" className="relative group inline-block">
                {/* Animated border gradient */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl opacity-40 group-hover:opacity-70 blur-xl transition-all duration-700 group-hover:animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-xl opacity-0 group-hover:opacity-100 blur-md transition-all duration-500 animate-spin" style={{ animationDuration: '3s' }} />
                
                {/* Button */}
                <button className="relative px-6 xl:px-8 py-3 xl:py-3.5 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700 text-white text-sm font-semibold rounded-xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-[1.03] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 overflow-hidden">
                  {/* Multiple shimmer layers */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <span className="relative z-10 flex items-center gap-2.5">
                    <Zap className="w-4 h-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                    <span className="tracking-wide">Member Login</span>
                    <div className="w-2 h-2 bg-white/80 rounded-full" />
                  </span>

                  {/* Bottom glow */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                </button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden relative p-2.5 rounded-xl text-gray-700 hover:text-blue-600 transition-all duration-300 group flex-shrink-0"
              aria-label="Toggle menu"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <div className="absolute inset-0 bg-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 blur-lg transition-all duration-300" />
              {isMenuOpen ? (
                <X className="w-6 h-6 relative z-10 transform group-hover:rotate-90 transition-transform duration-500" />
              ) : (
                <Menu className="w-6 h-6 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              )}
              <div className="absolute -inset-1 border border-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div 
              className="lg:hidden pb-5 sm:pb-6 border-t border-transparent mt-2"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                backdropFilter: 'blur(24px) saturate(180%)',
                animation: 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 20px 40px rgba(59, 130, 246, 0.1)'
              }}
            >
              <nav className="flex flex-col gap-1.5 pt-4 px-2 sm:px-3">
                {navLinks.map((link, index) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="relative group px-4 sm:px-5 py-4 text-sm sm:text-base font-medium text-gray-700 hover:text-blue-600 rounded-xl transition-all duration-300 overflow-hidden"
                    style={{
                      animation: `slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.06}s both`
                    }}
                  >
                    {/* Background effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50 to-cyan-50/0 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
                    
                    <span className="relative z-10 flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        <span className="text-lg group-hover:scale-110 transition-transform duration-300">{link.icon}</span>
                        <span>{link.label}</span>
                      </span>
                      <ChevronRight className="w-5 h-5 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-blue-600" />
                    </span>

                    {/* Animated border */}
                    <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 group-hover:w-full transition-all duration-500 rounded-full shadow-lg shadow-blue-500/50" />
                    
                    {/* Top highlight */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </a>
                ))}
                
                {/* Mobile CTA */}
                <div className="px-2 pt-5 mt-3 border-t border-transparent">
                  <a href="/auth" className="block group">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl opacity-30 group-hover:opacity-50 blur-xl transition-all duration-500 animate-pulse" style={{ animationDuration: '2s' }} />
                      <button className="relative w-full px-6 py-4 sm:py-4.5 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700 text-white text-sm sm:text-base font-semibold rounded-xl shadow-xl shadow-blue-500/25 transform active:scale-[0.97] transition-all duration-300 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                        <span className="relative z-10 flex items-center justify-center gap-2.5">
                          <Zap className="w-4 h-4" />
                          <span className="tracking-wide">Member Login</span>
                        </span>
                      </button>
                    </div>
                  </a>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <style>{`
        @keyframes particleFloat {
          0%, 100% { 
            transform: translate(0, 0) scale(1); 
            opacity: 0.4; 
          }
          25% { 
            transform: translate(10px, -15px) scale(1.2); 
            opacity: 0.7; 
          }
          50% { 
            transform: translate(-5px, -25px) scale(0.9); 
            opacity: 0.5; 
          }
          75% { 
            transform: translate(15px, -10px) scale(1.1); 
            opacity: 0.6; 
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default Header;
