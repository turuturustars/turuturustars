import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import logoImage from '@/assets/turuturustarslogo.png';

const Footer = () => {
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();

  const quickLinks = [
    { label: 'About Us', href: '#about' },
    { label: 'Our Pillars', href: '#pillars' },
    { label: 'Leadership', href: '#leadership' },
    { label: 'Join Us', href: '#join' },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="bg-foreground text-primary-foreground relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse animation-delay-300 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gold/5 rounded-full blur-3xl animate-pulse animation-delay-500 -z-10"></div>

      <div ref={contentRef} className="section-container py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className={`lg:col-span-2 transition-all duration-700 ${
            contentVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <img 
                src={logoImage}
                alt="Turuturu Stars Logo"
                className="w-12 h-12 rounded-full object-cover group hover:shadow-glow transition-all duration-300 hover:scale-110"
              />
              <div>
                <span className="font-serif text-xl font-semibold group-hover:text-gold transition-colors duration-300">Turuturu Stars</span>
                <span className="block text-sm text-primary-foreground/60">Community Based Organization</span>
              </div>
            </div>
            <p className="text-primary-foreground/70 max-w-md leading-relaxed hover:text-primary-foreground/90 transition-colors duration-300">
              A united family founded on the belief that service to mankind is service to God. 
              Guided by Ubuntu: "I am because we are."
            </p>
            <p className="text-gold font-serif text-lg italic mt-4 hover:text-gold/80 transition-colors duration-300">
              East or West, Turuturu is Home.
            </p>
          </div>

          {/* Quick Links */}
          <div className={`transition-all duration-700 animation-delay-100 ${
            contentVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
          }`}>
            <h4 className="font-serif text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={link.label} className={`transition-all duration-500 ${
                  contentVisible ? `animate-slide-right animation-delay-${(index + 1) * 100}` : 'opacity-0 translate-x-5'
                }`}>
                  <a 
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-gold hover:translate-x-1 transition-all duration-300 inline-block"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className={`transition-all duration-700 animation-delay-200 ${
            contentVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
          }`}>
            <h4 className="font-serif text-lg font-semibold mb-6">Connect With Us</h4>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className={`w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary hover:text-primary-foreground hover:shadow-glow hover:scale-110 flex items-center justify-center transition-all duration-300 animation-delay-${(index + 1) * 100} ${
                    contentVisible ? 'animate-fade-up' : 'opacity-0 scale-50'
                  }`}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
            <div className={`mt-8 transition-all duration-700 animation-delay-300 ${
              contentVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
            }`}>
              <p className="text-sm text-primary-foreground/60 mb-2">Registered</p>
              <p className="font-medium">September 11, 2023</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t border-primary-foreground/10 transition-all duration-700 animation-delay-400 ${
        contentVisible ? 'animate-fade-up' : 'opacity-0'
      }`}>
        <div className="section-container py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/60 hover:text-primary-foreground/80 transition-colors duration-300">
            © {new Date().getFullYear()} Turuturu Stars CBO. All rights reserved.
          </p>
          <p className="text-sm text-gold font-serif italic hover:text-gold/80 transition-colors duration-300">
            Together We Stand
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
