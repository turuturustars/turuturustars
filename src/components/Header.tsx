import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import turuturuLogo from '@/assets/turuturustarslogo.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const mainNavLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Pillars', href: '#pillars' },
    { label: 'Leadership', href: '#leadership' },
    { label: 'Careers', href: '#careers' },
    { label: 'Register', href: '#register' },
  ];

  const closeMenus = () => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
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
          <a href="#home" className="flex items-center gap-2 group flex-shrink-0">
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

          {/* Desktop Navigation - Enhanced */}
          <nav className="hidden lg:flex items-center gap-2">
            {mainNavLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
          </nav>

          {/* CTA Button - Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <a href="/auth">
              <Button className="btn-primary relative overflow-hidden group">
                <span className="relative z-10">Member Login</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
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

        {/* Mobile Navigation - Enhanced with Better UX */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-fade-up bg-card/50 backdrop-blur-sm">
            <nav className="flex flex-col gap-1">
              {mainNavLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeMenus}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-all duration-300 flex items-center justify-between group"
                >
                  <span>{link.label}</span>
                  <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300" />
                </a>
              ))}
              
              {/* Mobile CTA */}
              <div className="px-4 pt-4 border-t border-border/50 mt-2">
                <a href="/auth" className="block">
                  <Button className="btn-primary w-full">
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
