import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const JoinSection = () => {
  return (
    <section id="join" className="py-24 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
      
      {/* Decorative Patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-40 h-40 border border-primary-foreground rounded-full" />
        <div className="absolute bottom-20 right-20 w-60 h-60 border border-primary-foreground rounded-full" />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 border border-primary-foreground rounded-full" />
      </div>

      <div className="section-container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Heading */}
          <h2 className="heading-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Together We Stand
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            To all alumni and friends yet to join us—this is your home. Walk with us as we preserve 
            our identity and build a lasting legacy.
          </p>

          {/* CTA */}
          <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-10 py-6 rounded-2xl shadow-hero hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
            Become a Member Today
            <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Contact Info */}
          <div className="mt-16 grid sm:grid-cols-3 gap-6">
            <div className="flex items-center justify-center gap-3 text-primary-foreground/80">
              <Mail className="w-5 h-5" />
              <span>info@turuturustars.org</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-primary-foreground/80">
              <Phone className="w-5 h-5" />
              <span>+254 700 000 000</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-primary-foreground/80">
              <MapPin className="w-5 h-5" />
              <span>Kigumo, Murang'a County</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
