import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import turuturuLogo from '@/assets/turuturustarslogo.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Updated to use proper routes for independent pages
  const mainNavLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Pillars', href: '/pillars' },
    { label: 'Leadership', href: '/leadership' },
    { label: 'Careers', href: '/careers' },
    { label: 'Register', href: '/register' },
  ];

  const closeMenus = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-elevated' 
        : 'bg-card/80 backdrop-blur-lg border-b border-border/30'
    }`}>
      <div className="section-container">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo - Enhanced with Animation */}
          <a href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="relative">
              <img 
                src={turuturuLogo} 
                alt="Turuturu Stars Logo" 
                className="h-10 w-auto lg:h-12 object-contain shadow-soft group-hover:shadow-elevated transition-all duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 rounded-full transition-all duration-300 blur-lg"></div>
            </div>
            <div className="hidden sm:block">
              <span className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                Turuturu Stars
              </span>
              <span className="block text-xs text-muted-foreground -mt-1 group-hover:text-primary/70 transition-colors">CBO</span>
            </div>
          </a>

          {/* Desktop Navigation - Enhanced with Premium Feel */}
          <nav className="hidden lg:flex items-center gap-1">
            {mainNavLinks.map((link) => {
              const isActive = location.pathname === link.href || (link.href === '#register' && location.pathname === '/');
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-300 group smooth-color ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {link.label}
                  <span className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary rounded-full transition-all duration-500 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </a>
              );
            })}
          </nav>

          {/* CTA Button - Desktop with Enhanced Hover */}
          <div className="hidden lg:flex items-center gap-3">
            <a href="/auth">
              <Button className="btn-primary relative overflow-hidden group px-6 py-2.5 font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 card-hover">
                <span className="relative z-10 flex items-center gap-2">
                  Member Login
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button - Enhanced */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-all duration-300 active:scale-95"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-foreground animate-fadeUp" />
            ) : (
              <Menu className="w-6 h-6 text-foreground animate-fadeUp" />
            )}
          </button>
        </div>

        {/* Mobile Navigation - Enhanced Premium UX */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-fade-up bg-card/80 backdrop-blur-xl shadow-lg">
            <nav className="flex flex-col gap-1 px-2">
              {mainNavLinks.map((link, index) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeMenus}
                  className="px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300 flex items-center justify-between group smooth-color stagger-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span>{link.label}</span>
                  <ChevronDown className="w-4 h-4 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 text-primary" />
                </a>
              ))}
              
              {/* Mobile CTA - Enhanced */}
              <div className="px-2 pt-4 border-t border-border/50 mt-2">
                <a href="/auth" className="block">
                  <Button className="btn-primary w-full font-semibold hover:shadow-lg transition-all duration-300 card-hover">
                    Member Login
                  </Button>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
