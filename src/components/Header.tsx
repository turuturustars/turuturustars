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
  { label: 'Jobs', href: '/jobs' },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    if (href === '/jobs') {
      return ['/jobs', '/government-jobs', '/public-jobs', '/muranga-jobs'].some((path) =>
        location.pathname.startsWith(path)
      );
    }
    return location.pathname.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    if (location.pathname === href) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          'mx-auto mt-3 w-[min(1180px,calc(100%-1rem))] overflow-hidden rounded-[1.15rem] border backdrop-blur-xl transition-all duration-300',
          isScrolled
            ? 'border-slate-200/80 bg-white/[0.94] shadow-[0_18px_42px_-28px_rgba(6,22,39,0.62)]'
            : 'border-white/20 bg-[#061c2c]/60 shadow-[0_16px_42px_-28px_rgba(0,0,0,0.75)]'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:h-[4.35rem] sm:px-4 md:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Turuturu Stars home">
            <img
              src={logo}
              alt="Turuturu Stars"
              className="h-11 w-auto object-contain sm:h-12"
            />
            <span
              className={cn(
                'hidden leading-tight sm:block',
                isScrolled ? 'text-[#0a263b]' : 'text-white'
              )}
            >
              <span className="block text-sm font-black tracking-normal">Turuturu Stars</span>
              <span
                className={cn(
                  'block text-[11px] font-semibold tracking-normal',
                  isScrolled ? 'text-[#617286]' : 'text-white/70'
                )}
              >
                Community Based Organization
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "relative px-0.5 py-2 text-sm font-bold tracking-normal transition-colors after:absolute after:bottom-1 after:left-0 after:h-[2px] after:w-full after:origin-left after:rounded-full after:bg-[#f1c762] after:transition-transform after:content-['']",
                  isActive(item.href)
                    ? cn('after:scale-x-100', isScrolled ? 'text-[#0a263b]' : 'text-white')
                    : cn('after:scale-x-0', isScrolled ? 'text-[#556b7f] hover:text-[#0a263b]' : 'text-white/76 hover:text-white')
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/donate"
              className={cn(
                'rounded-xl border px-3.5 py-2 text-sm font-bold tracking-normal transition',
                isScrolled
                  ? 'border-slate-300 text-[#0a314d] hover:border-[#0a314d] hover:bg-slate-50'
                  : 'border-white/35 text-white hover:border-[#f1c762] hover:bg-white/10'
              )}
            >
              Donate
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-[#36b8ff] px-4 py-2 text-sm font-black tracking-normal text-[#05243a] transition hover:bg-[#8fdcff]"
            >
              <LogIn className="h-4 w-4" />
              Member login
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition md:hidden',
              isScrolled
                ? 'border-slate-300 bg-white text-[#0a314d]'
                : 'border-white/25 bg-white/[0.08] text-white'
            )}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div
            className={cn(
              'border-t p-2 md:hidden',
              isScrolled ? 'border-slate-200 bg-white' : 'border-white/15 bg-[#061c2c]/96'
            )}
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-bold tracking-normal transition-colors',
                    isActive(item.href)
                      ? 'bg-[#f6d77b] text-[#081f31]'
                      : isScrolled
                        ? 'text-[#445b70] hover:bg-slate-100 hover:text-[#0a263b]'
                        : 'text-white/78 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div
              className={cn(
                'mt-2 grid grid-cols-2 gap-2 border-t pt-2',
                isScrolled ? 'border-slate-200' : 'border-white/15'
              )}
            >
              <Link
                to="/donate"
                className={cn(
                  'rounded-lg border px-3 py-2 text-center text-sm font-bold',
                  isScrolled ? 'border-slate-300 text-[#0a314d]' : 'border-white/35 text-white'
                )}
              >
                Donate
              </Link>
              <Link
                to="/auth"
                className="rounded-lg bg-[#36b8ff] px-3 py-2 text-center text-sm font-black text-[#05243a]"
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
