import { ArrowRight, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroCommunity from '@/assets/gallery-members.png';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const HeroSection = () => {
  const { ref } = useScrollAnimation();

  return (
    <section 
      ref={ref}
      id="home" 
      className="relative min-h-screen flex items-center pt-20 overflow-hidden"
    >
      {/* Animated background gradients */}
      <div className="absolute inset-0 z-0">
        {/* Main hero image with overlay */}
        <img 
          src={heroCommunity} 
          alt="Turuturu community gathering" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
        
        {/* Animated gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent animate-pulse-soft" />
      </div>

      {/* Decorative floating elements */}
      <div className="absolute top-32 right-20 hidden lg:block animate-float z-10">
        <Star className="w-8 h-8 text-gold animate-pulse-soft" fill="currentColor" />
      </div>
      <div className="absolute bottom-40 right-40 hidden lg:block animate-float animation-delay-200 z-10">
        <Star className="w-6 h-6 text-gold animate-pulse-soft animation-delay-200" fill="currentColor" />
      </div>

      {/* Animated geometric shapes */}
      <div className="absolute top-1/4 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse animation-delay-300 z-0" />
      <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-pulse animation-delay-500 z-0" />

      <div className="section-container relative z-10">
        <div className="max-w-3xl">
          {/* Badge with animation */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6 animate-fade-up">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-primary-foreground/90">
              Est. 2019 • 200+ Members Strong
            </span>
          </div>

          {/* Main heading with staggered animation */}
          <h1 className="heading-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground leading-tight mb-6 animate-fade-up animation-delay-100">
            East or West, <br />
            <span className="text-gold animate-pulse-soft">Turuturu is Home</span>
          </h1>

          {/* Description with fade animation */}
          <p className="text-lg sm:text-xl text-primary-foreground/80 leading-relaxed mb-8 max-w-2xl animate-fade-up animation-delay-200">
            A united family founded on the belief that service to mankind is service to God. 
            Guided by Ubuntu: <em className="text-gold">"I am because we are."</em>
          </p>

          {/* CTA Buttons with staggered animation */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up animation-delay-300">
            <Button className="btn-primary text-base px-8 py-4 group relative overflow-hidden">
              <span className="relative z-10 flex items-center">
                Join Our Family
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </Button>
            <Button 
              variant="outline" 
              className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 hover:text-primary-foreground text-base px-8 py-4 transition-all duration-300 hover:border-primary-foreground/60"
            >
              Learn More
            </Button>
          </div>

          {/* Key Dates with staggered reveals */}
          <div className="flex flex-wrap gap-6 mt-12 pt-8 border-t border-primary-foreground/20 animate-fade-up animation-delay-400">
            <div className="animate-fade-up animation-delay-300">
              <p className="text-sm text-primary-foreground/60">Envisioned</p>
              <p className="font-serif text-xl text-primary-foreground font-semibold">Dec 29, 2019</p>
            </div>
            <div className="w-px bg-primary-foreground/20" />
            <div className="animate-fade-up animation-delay-400">
              <p className="text-sm text-primary-foreground/60">Registered</p>
              <p className="font-serif text-xl text-primary-foreground font-semibold">Sep 11, 2023</p>
            </div>
            <div className="w-px bg-primary-foreground/20" />
            <div className="animate-fade-up animation-delay-500">
              <p className="text-sm text-primary-foreground/60">Launched</p>
              <p className="font-serif text-xl text-primary-foreground font-semibold">Sep 16, 2023</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-float hidden md:block">
        <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/40 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-primary-foreground/60 animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
