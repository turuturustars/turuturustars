import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  Home,
  Sparkles,
  Landmark,
  Users,
  Briefcase,
  HeartHandshake,
  PencilLine,
  LogIn,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/turuturustarslogo.png";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "About", href: "/about", icon: Sparkles },
  { label: "Pillars", href: "/pillars", icon: Landmark },
  { label: "Leadership", href: "/leadership", icon: Users },
  { label: "Careers", href: "/careers", icon: Briefcase },
  { label: "Donate", href: "/donate", icon: HeartHandshake },
  { label: "Register", href: "/register", icon: PencilLine },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("/");
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const syncActive = () => setActiveHref(window.location.pathname || "/");
    syncActive();
    window.addEventListener("popstate", syncActive);
    return () => window.removeEventListener("popstate", syncActive);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
      setScrollProgress(percent);
      setScrolled(scrollTop > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const renderDesktopNav = () => (
    <nav className="hidden lg:flex items-center gap-1 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl px-2 py-1.5 shadow-[0_15px_40px_-25px_rgba(15,23,42,0.35)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeHref === item.href;
        return (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "group relative inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-xl transition-all duration-300",
              "text-slate-600 hover:text-slate-900",
              isActive && "text-slate-900"
            )}
            onClick={() => setActiveHref(item.href)}
          >
            <span
              className={cn(
                "absolute inset-0 rounded-xl transition-all duration-300",
                "border border-transparent bg-transparent",
                "group-hover:border-slate-200/80 group-hover:bg-slate-50/70",
                isActive && "border-blue-100/70 bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50"
              )}
            />
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {item.label}
            </span>
            {isActive && (
              <span className="absolute -bottom-[6px] left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_4px_12px_-6px_rgba(59,130,246,0.7)]" />
            )}
          </a>
        );
      })}
    </nav>
  );

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* background and light accents */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#f7fbff]/95 via-white/96 to-[#f4f8ff]/95" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-20 -top-28 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/18 via-cyan-400/12 to-transparent blur-3xl" />
        <div className="absolute right-6 -bottom-24 h-56 w-56 rounded-full bg-gradient-to-tl from-emerald-400/14 via-blue-400/10 to-transparent blur-3xl" />
      </div>

      {/* Scroll progress bar */}
      <div className="absolute left-0 right-0 h-[3px] bg-transparent">
        <div
          className="h-full origin-left bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-[width] duration-200 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div
        className={cn(
          "relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8",
          scrolled ? "pb-2" : "pb-3"
        )}
      >
        <div
          className={cn(
            "mt-2 flex items-center justify-between gap-3 rounded-3xl border transition-all duration-300",
            "bg-white/80 backdrop-blur-2xl shadow-[0_25px_60px_-35px_rgba(15,23,42,0.45)]",
            scrolled
              ? "border-slate-200/80 shadow-lg shadow-blue-500/10 translate-y-0"
              : "border-white/60"
          )}
        >
          {/* Brand */}
          <a href="/" className="flex items-center gap-3 sm:gap-4 px-4 py-3 min-w-0">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white shadow-soft overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-400/10 to-transparent" />
              <img
                src={logo}
                alt="Turuturu Stars"
                className="relative h-8 w-8 object-contain drop-shadow-sm"
              />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <span className="truncate text-base sm:text-lg md:text-xl font-semibold text-slate-900 tracking-tight">
                  Turuturu Stars
                </span>
                <Sparkles className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-slate-500">CBO</span>
            </div>
          </a>

          {/* Desktop nav */}
          {renderDesktopNav()}

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2 pr-3 sm:pr-4">
            <a
              href="/auth"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 shadow-lg shadow-blue-500/25 transition hover:translate-y-[-2px] hover:shadow-blue-500/35"
            >
              <LogIn className="w-4 h-4" />
              Member Login
            </a>

            <button
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200/80 bg-white/85 shadow-sm text-slate-700 hover:text-blue-600 transition"
              aria-label="Toggle menu"
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-3 mb-4 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden">
            <nav className="flex flex-col divide-y divide-slate-100">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeHref === item.href;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setActiveHref(item.href);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors",
                      isActive ? "text-blue-700 bg-blue-50/80" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isActive ? "bg-blue-500" : "bg-slate-200"
                      )}
                    />
                  </a>
                );
              })}
              <a
                href="/auth"
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500"
                onClick={() => setIsMenuOpen(false)}
              >
                <LogIn className="w-4 h-4" />
                Member Login
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;