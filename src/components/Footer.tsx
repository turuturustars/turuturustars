import { Star, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
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
    <footer className="bg-foreground text-primary-foreground">
      <div className="section-container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Star className="w-6 h-6 text-primary-foreground" fill="currentColor" />
              </div>
              <div>
                <span className="font-serif text-xl font-semibold">Turuturu Stars</span>
                <span className="block text-sm text-primary-foreground/60">Community Based Organization</span>
              </div>
            </div>
            <p className="text-primary-foreground/70 max-w-md leading-relaxed">
              A united family founded on the belief that service to mankind is service to God. 
              Guided by Ubuntu: "I am because we are."
            </p>
            <p className="text-gold font-serif text-lg italic mt-4">
              East or West, Turuturu is Home.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-6">Connect With Us</h4>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all duration-300"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
            <div className="mt-8">
              <p className="text-sm text-primary-foreground/60 mb-2">Registered</p>
              <p className="font-medium">September 11, 2023</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="section-container py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} Turuturu Stars CBO. All rights reserved.
          </p>
          <p className="text-sm text-primary-foreground/60">
            Together We Stand
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
