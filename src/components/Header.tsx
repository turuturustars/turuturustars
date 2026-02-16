import { useEffect, useState } from 'react';
import { LogIn, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logo from '@/assets/turuturustarslogo.png';

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Pillars', href: '/pillars' },
  { label: 'Leadership', href: '/leadership' },
  { label: 'Careers', href: '/careers' },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          'mx-auto mt-3 w-[min(1160px,calc(100%-1rem))] rounded-2xl border backdrop-blur-xl transition-all duration-300',
          isScrolled
            ? 'border-[#1f5f89]/75 bg-[#07243a]/95 shadow-[0_16px_40px_-20px_rgba(6,22,39,0.55)]'
            : 'border-[#1f5f89]/60 bg-[#07243a]/88 shadow-[0_10px_30px_-20px_rgba(6,22,39,0.48)]'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-4 md:px-5">
          <Link to="/" className="flex min-w-0 items-center">
            <img
              src={logo}
              alt="Turuturu Stars"
              className="h-11 w-auto object-contain sm:h-12"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-xl border border-[#2a6f9b]/70 bg-[#0a314d]/70 p-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive(item.href)
                    ? 'bg-[#21adff] text-[#05243a]'
                    : 'text-[#d4ecff] hover:bg-[#15547d]/60 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/donate"
              className="rounded-xl border border-[#7cc8ff]/70 px-3.5 py-2 text-sm font-semibold text-[#d4ecff] transition hover:border-[#a8ddff] hover:bg-[#114564]/55"
            >
              Donate
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-[#21adff] px-4 py-2 text-sm font-semibold text-[#05243a] transition hover:bg-[#3db8ff]"
            >
              <LogIn className="h-4 w-4" />
              Member login
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a6f9b]/70 bg-[#0a314d]/70 text-[#d4ecff] transition hover:text-white md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-[#2a6f9b]/65 bg-[#07243a]/96 p-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive(item.href)
                      ? 'bg-[#21adff] text-[#05243a]'
                      : 'text-[#d4ecff] hover:bg-[#15547d]/60 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#2a6f9b]/65 pt-2">
              <Link
                to="/donate"
                className="rounded-lg border border-[#7cc8ff]/70 px-3 py-2 text-center text-sm font-semibold text-[#d4ecff]"
              >
                Donate
              </Link>
              <Link
                to="/auth"
                className="rounded-lg bg-[#21adff] px-3 py-2 text-center text-sm font-semibold text-[#05243a]"
              >
                Member login
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
