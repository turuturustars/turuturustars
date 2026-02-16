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
            ? 'border-slate-200/80 bg-white/92 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.36)]'
            : 'border-white/70 bg-white/86 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.24)]'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-4 md:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src={logo}
              alt="Turuturu Stars"
              className="h-9 w-9 rounded-xl object-contain sm:h-10 sm:w-10"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold text-slate-900 sm:text-base">Turuturu Stars</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Community CBO</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-xl border border-slate-200 bg-white/80 p-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive(item.href)
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/donate"
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              Donate
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a7bcc] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#096fb9]"
            >
              <LogIn className="h-4 w-4" />
              Member login
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:text-slate-900 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-200 bg-white/95 p-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive(item.href)
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
              <Link
                to="/donate"
                className="rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700"
              >
                Donate
              </Link>
              <Link
                to="/auth"
                className="rounded-lg bg-[#0a7bcc] px-3 py-2 text-center text-sm font-semibold text-white"
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
