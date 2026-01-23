import { ArrowRight, Star, Sparkles, Users, Award, Heart, ChevronDown, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroCommunity from '@/assets/gallery-members.png';
import { useState, useEffect } from 'react';

const HeroSection = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [typedText, setTypedText] = useState('');
  const fullText = 'Turuturu is Home';
  
  // Optimized typing effect - faster and non-blocking
  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 70); // Faster animation

    return () => clearInterval(typingInterval);
  }, []);

  const stats = [
    { icon: Users, value: '200+', label: 'Members', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Award, value: '2019', label: 'Est.', gradient: 'from-purple-500 to-pink-500' },
    { icon: Heart, value: '100%', label: 'Ubuntu', gradient: 'from-rose-500 to-orange-500' },
  ];

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-white via-blue-50/30 to-white min-h-screen"
    >
      {/* Simplified Background - Single element for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-2xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-12 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
          
          {/* LEFT: Content */}
          <div className="space-y-6 sm:space-y-8">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-300">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-blue-600">
                Est. 2019 • 200+ Members
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            </div>

            {/* Main Heading with Typing Effect */}
            <div className="space-y-3">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="block text-gray-900">
                  East or West,
                </span>
                <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 bg-clip-text text-transparent min-h-[1.2em]">
                  {typedText}
                  <span className="inline-block w-0.5 h-[0.9em] bg-blue-600 ml-1 animate-pulse"></span>
                </span>
              </h1>
              
              <div className="flex items-center gap-2">
                <div className="h-1 w-16 sm:w-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
            </div>

            {/* Description */}
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-xl">
              A united family built on faith, service, and Ubuntu —{' '}
              <span className="font-semibold text-blue-600 italic">
                "I am because we are."
              </span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                className="group px-8 py-6 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
                onClick={() => scrollToSection('register')}
              >
                Join Our Family
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="group px-8 py-6 text-base font-semibold border-2 hover:border-blue-600 hover:bg-blue-50 transition-all duration-300"
                onClick={() => scrollToSection('about')}
              >
                <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                Learn More
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="group rounded-xl bg-white border border-gray-200 p-4 sm:p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <Icon className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 border-2 border-white"></div>
                  ))}
                </div>
                <span className="font-medium">200+ Active Members</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-medium">5 Years Strong</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Image */}
          <div className="relative lg:ml-auto max-w-xl w-full">
            
            {/* Background Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
            </div>

            {/* Image Container */}
            <div className="relative group">
              {/* Gradient Border */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
              
              {/* Image */}
              <div className="relative rounded-3xl overflow-hidden bg-white p-2 shadow-2xl">
                <img
                  src={heroCommunity}
                  alt="Turuturu community"
                  className={`w-full h-auto rounded-2xl transition-all duration-700 ${
                    imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  } group-hover:scale-105`}
                  onLoad={() => setImageLoaded(true)}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="high"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-3 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Community</p>
                    <p className="text-sm font-bold text-gray-900">United</p>
                  </div>
                </div>
              </div>

              {/* Decorative Stars */}
              <Star className="absolute -top-4 -right-4 w-8 h-8 text-amber-500 fill-amber-500 animate-pulse" />
              <Sparkles className="absolute top-10 -left-4 w-6 h-6 text-blue-600 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <button 
          onClick={() => scrollToSection('about')}
          className="group flex flex-col items-center gap-2"
          aria-label="Scroll to next section"
        >
          <span className="text-xs text-gray-600 font-medium group-hover:text-blue-600 transition-colors">
            Scroll to explore
          </span>
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-gray-300 group-hover:border-blue-600 p-1.5 transition-colors bg-white/50">
            <ChevronDown className="h-3 w-3 text-gray-600 group-hover:text-blue-600 animate-bounce" />
          </div>
        </button>
      </div>
    </section>
  );
};

export default HeroSection;