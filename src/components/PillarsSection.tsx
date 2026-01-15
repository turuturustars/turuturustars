import { GraduationCap, Users, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useStaggerAnimation } from '@/hooks/useScrollAnimation';

const pillars = [
  {
    icon: GraduationCap,
    title: 'Education Development',
    description:
      'Empowering the next generation through mentorship, scholarships, and access to quality educational opportunities.',
    accent: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-600',
    bgGradient: 'from-blue-50 to-cyan-50/50',
    hoverGlow: 'group-hover:shadow-blue-500/20',
    features: ['Mentorship Programs', 'Scholarship Funds', 'Learning Resources']
  },
  {
    icon: Users,
    title: 'Community Development',
    description:
      'Strengthening social bonds and shared identity through initiatives that uplift, connect, and empower our people.',
    accent: 'from-amber-500 to-orange-500',
    iconColor: 'text-amber-600',
    bgGradient: 'from-amber-50 to-orange-50/50',
    hoverGlow: 'group-hover:shadow-amber-500/20',
    features: ['Social Initiatives', 'Cultural Preservation', 'Unity Programs']
  },
  {
    icon: Heart,
    title: "Members' Welfare",
    description:
      'Caring for one another in moments of joy and hardship, ensuring every member feels supported and valued.',
    accent: 'from-rose-500 to-pink-500',
    iconColor: 'text-rose-600',
    bgGradient: 'from-rose-50 to-pink-50/50',
    hoverGlow: 'group-hover:shadow-rose-500/20',
    features: ['Support Networks', 'Emergency Assistance', 'Celebration Together']
  },
];

const PillarsSection = () => {
  const { containerRef, isVisible } = useStaggerAnimation();

  return (
    <section id="pillars" className="relative py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/3 to-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="section-container relative">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16 lg:mb-20">
          <div 
            className={`inline-flex items-center gap-2 mb-4 sm:mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-semibold tracking-wider text-primary uppercase">
              Our Foundation
            </span>
          </div>
          
          <h2 
            className={`heading-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-4 sm:mb-6 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Pillars of Our Vision
          </h2>
          
          <p 
            className={`text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Guided by the spirit of <span className="font-semibold text-primary">Ubuntu</span>, these pillars define who we are,
            what we stand for, and how we serve our community.
          </p>
        </div>

        {/* Pillars Grid */}
        <div
          ref={containerRef}
          className="grid gap-6 sm:gap-8 lg:gap-10 sm:grid-cols-2 lg:grid-cols-3 mb-16 sm:mb-20 lg:mb-28"
        >
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className={`group relative rounded-3xl bg-white p-6 sm:p-8 lg:p-10 shadow-lg transition-all duration-700 hover:shadow-2xl ${pillar.hoverGlow} hover:-translate-y-2 border border-gray-100 overflow-hidden
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
              `}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Gradient background overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${pillar.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              
              {/* Decorative corner element */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${pillar.accent} opacity-5 rounded-bl-full transition-all duration-500 group-hover:w-32 group-hover:h-32`}></div>

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6 sm:mb-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${pillar.accent} p-0.5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                    <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                      <pillar.icon className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 ${pillar.iconColor}`} />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}>
                  {pillar.title}
                </h3>

                {/* Description */}
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
                  {pillar.description}
                </p>

                {/* Features List */}
                <div className="space-y-2 mb-6">
                  {pillar.features.map((feature, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 group-hover:text-gray-700 transition-colors duration-300"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${pillar.accent}`}></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Accent line with arrow */}
                <div className="flex items-center gap-2">
                  <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${pillar.accent} group-hover:w-20 transition-all duration-500`}></div>
                  <ArrowRight className={`w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 bg-gradient-to-r ${pillar.accent} bg-clip-text text-transparent`} />
                </div>
              </div>

              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>
          ))}
        </div>

        {/* Ubuntu Quote Section */}
        <div 
          className={`relative max-w-5xl mx-auto transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="relative rounded-3xl bg-gradient-to-br from-primary/5 via-white to-blue-500/5 p-8 sm:p-12 lg:p-16 shadow-xl border border-primary/10 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-br-full"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-blue-500/10 to-transparent rounded-tl-full"></div>
            
            {/* Quote marks */}
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 text-6xl sm:text-7xl lg:text-8xl font-serif text-primary/10 leading-none">"</div>
            
            <blockquote className="relative text-center space-y-6 sm:space-y-8">
              <p className="heading-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-gray-900 via-primary to-gray-900 bg-clip-text text-transparent italic px-4">
                I am because we are
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-primary"></div>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600 font-semibold tracking-wide">
                  Ubuntu Philosophy
                </p>
                <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-primary"></div>
              </div>

              <p className="text-xs sm:text-sm lg:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed px-4">
                The ancient African philosophy that reminds us of our shared humanity and interconnectedness
              </p>
            </blockquote>

            {/* Bottom decorative quote mark */}
            <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 text-6xl sm:text-7xl lg:text-8xl font-serif text-primary/10 leading-none rotate-180">"</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;