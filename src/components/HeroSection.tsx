import { ArrowRight, Star, Sparkles, Users, Award, Heart, ChevronDown, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroCommunity from '@/assets/gallery-members.png';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useState } from 'react';

const HeroSection = () => {
  const { ref } = useScrollAnimation();
  const [imageLoaded, setImageLoaded] = useState(false);

  const stats = [
    { icon: Users, value: '200+', label: 'Active Members', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Award, value: '2019', label: 'Established', gradient: 'from-purple-500 to-pink-500' },
    { icon: Heart, value: '100%', label: 'Ubuntu Spirit', gradient: 'from-rose-500 to-orange-500' },
  ];

  const milestones = [
    { label: 'Envisioned', date: 'Dec 29, 2019', icon: Sparkles },
    { label: 'Registered', date: 'Sep 11, 2023', icon: Award },
    { label: 'Launched', date: 'Sep 16, 2023', icon: Star },
  ];

  return (
    <section
      ref={ref}
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white min-h-screen"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/20 via-blue-500/20 to-transparent blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-500/15 via-pink-500/15 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl"></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-primary/30 rounded-full animate-float"></div>
        <div className="absolute top-40 right-32 w-1.5 h-1.5 bg-blue-500/40 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-40 left-40 w-2.5 h-2.5 bg-purple-500/30 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-20 w-1 h-1 bg-pink-500/40 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-20 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center w-full">
          
          {/* LEFT: Text Content */}
          <div className="relative z-10 space-y-6 sm:space-y-8 lg:space-y-10 animate-fadeInUp">
            
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-primary/15 via-blue-500/15 to-primary/15 border border-primary/40 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:scale-105 hover:border-primary/60 transition-all duration-300 group cursor-default card-hover">
              <div className="relative">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 animate-pulse" />
                <div className="absolute inset-0 blur-sm">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                </div>
              </div>
              <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-primary via-blue-600 to-primary bg-clip-text text-transparent">
                Est. 2019 • 200+ Members Strong
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>

            {/* Main Heading */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight">
                <span className="inline-block animate-fadeInUp">
                  East or West,
                </span>
                <br />
                <span className="inline-block bg-gradient-to-r from-primary via-blue-600 to-primary bg-clip-text text-transparent animate-fadeInUp bg-[length:200%_auto] animate-shimmerText" style={{ animationDelay: '0.1s' }}>
                  Turuturu is Home
                </span>
              </h1>
              
              {/* Decorative underline */}
              <div className="flex items-center gap-3 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                <div className="h-1 w-16 sm:w-20 lg:w-24 rounded-full bg-gradient-to-r from-primary to-blue-500"></div>
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500 animate-pulse" />
              </div>
            </div>

            {/* Subtext */}
            <p className="max-w-2xl text-base sm:text-lg lg:text-xl xl:text-2xl leading-relaxed text-gray-700 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              A united family built on faith, service, and Ubuntu —{' '}
              <span className="relative inline-block group/ubuntu cursor-default">
                <em className="font-semibold text-primary relative z-10">
                  "I am because we are."
                </em>
                <span className="absolute inset-0 bg-primary/10 -skew-x-12 scale-0 group-hover/ubuntu:scale-100 transition-transform duration-300 rounded"></span>
              </span>
            </p>

            {/* CTA Buttons - Enhanced Design */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
              <Button 
                className="group relative px-8 py-6 sm:py-7 text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-white shadow-lg hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 overflow-hidden hover:scale-105 active:scale-95 card-hover"
                onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span className="relative z-10 flex items-center">
                  Join Our Family
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                {/* Premium shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </Button>

              <Button
                variant="outline"
                className="group relative px-8 py-6 sm:py-7 text-base sm:text-lg font-semibold border-2 border-gray-300 hover:border-primary hover:bg-primary/5 hover:scale-105 transition-all duration-300 active:scale-95 card-hover"
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5 group-hover:scale-125 transition-transform duration-300" />
                  Learn More
                </span>
              </Button>
            </div>

            {/* Stats Cards - Enhanced with Better Hover Effects */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-md border border-gray-200/80 p-4 sm:p-5 lg:p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-default card-hover stagger-item"
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                  >
                    {/* Enhanced gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                    
                    <div className="relative">
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mb-2 sm:mb-3 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent group-hover:scale-125 transition-transform duration-300`} style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
                      <p className={`text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent mb-1`}>
                        {stat.value}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 font-semibold group-hover:text-gray-900 transition-colors">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Milestones Timeline - Enhanced */}
            <div className="border-t border-gray-200/60 pt-6 sm:pt-8 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {milestones.map((milestone, index) => {
                  const Icon = milestone.icon;
                  return (
                    <div key={index} className="group text-center sm:text-left stagger-item" style={{ animationDelay: `${0.6 + index * 0.1}s` }}>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 group-hover:gap-3 transition-all duration-300">
                        <Icon className="w-4 h-4 text-primary group-hover:scale-125 transition-transform duration-300" />
                        <p className="text-xs sm:text-sm text-gray-600 font-semibold group-hover:text-primary transition-colors duration-300">
                          {milestone.label}
                        </p>
                      </div>
                      <p className="font-serif text-sm sm:text-base lg:text-lg font-bold text-gray-900 group-hover:text-primary transition-colors duration-300">
                        {milestone.date}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Image Area */}
          <div className="relative flex items-center justify-center lg:justify-end animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            
            {/* Decorative Elements Behind Image */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Main glow */}
              <div className="w-[90%] h-[90%] rounded-full bg-gradient-to-br from-primary/20 via-blue-500/20 to-purple-500/20 blur-3xl animate-pulse"></div>
              
              {/* Rotating ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[95%] h-[95%] rounded-full border-2 border-primary/10 animate-spin-slow"></div>
              </div>
            </div>

            {/* Image Container */}
            <div className="relative z-10 w-full max-w-2xl bounce-in-top">
              {/* Image wrapper with effects */}
              <div className="relative group cursor-pointer">
                {/* Gradient border effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                
                {/* Main image */}
                <div className="relative rounded-3xl overflow-hidden bg-white p-2 shadow-2xl">
                  <img
                    src={heroCommunity}
                    alt="Turuturu community gathering"
                    className={`w-full h-auto object-cover rounded-2xl transition-all duration-700 ${
                      imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    } group-hover:scale-105`}
                    onLoad={() => setImageLoaded(true)}
                    loading="eager"
                  />
                  
                  {/* Image overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                </div>

                {/* Floating badge on image */}
                <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white rounded-2xl p-3 sm:p-4 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform duration-300">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">Community</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900">United</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative floating stars */}
              <Star className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-8 h-8 sm:w-10 sm:h-10 text-amber-500 fill-amber-500 animate-float drop-shadow-lg" />
              <Star className="absolute -bottom-2 right-12 sm:right-16 w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-amber-400 animate-float" style={{ animationDelay: '0.5s' }} />
              <Sparkles className="absolute top-12 -left-4 sm:-left-6 w-6 h-6 sm:w-8 sm:h-8 text-primary animate-float" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-20 animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
        <button 
          onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
          className="group flex flex-col items-center gap-2 cursor-pointer"
          aria-label="Scroll to next section"
        >
          <span className="text-xs sm:text-sm text-gray-600 font-medium group-hover:text-primary transition-colors">
            Scroll to explore
          </span>
          <div className="flex h-12 w-7 items-start justify-center rounded-full border-2 border-gray-300 group-hover:border-primary p-2 transition-colors bg-white/50 backdrop-blur-sm">
            <ChevronDown className="h-4 w-4 text-gray-600 group-hover:text-primary animate-bounce" />
          </div>
        </button>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes shimmerText {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .animate-shimmerText {
          animation: shimmerText 3s linear infinite;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </section>
  );
};

export default HeroSection;