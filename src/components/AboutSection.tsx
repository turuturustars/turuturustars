import {
  Target,
  Eye,
  Heart,
  Users,
  BookOpen,
  Home,
  Handshake,
  Calendar,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';
import { useStaggerAnimation } from '@/hooks/useScrollAnimation';

const AboutSection = () => {
  const { containerRef, isVisible } = useStaggerAnimation();

  const coreValues = [
    {
      icon: Users,
      title: 'Ubuntu',
      description: 'I am because we are — our foundation is built on collective identity and mutual support.',
      gradient: 'from-blue-500 to-cyan-500',
      glowColor: 'shadow-blue-500/20'
    },
    {
      icon: Heart,
      title: 'Service',
      description: 'Service to mankind is service to God — we serve with dedication and compassion.',
      gradient: 'from-rose-500 to-pink-500',
      glowColor: 'shadow-rose-500/20'
    },
    {
      icon: BookOpen,
      title: 'Education',
      description: 'Knowledge empowers communities — we invest in learning for lasting transformation.',
      gradient: 'from-purple-500 to-violet-500',
      glowColor: 'shadow-purple-500/20'
    },
    {
      icon: Home,
      title: 'Heritage',
      description: 'Preserving our identity — honoring our roots while building for future generations.',
      gradient: 'from-amber-500 to-orange-500',
      glowColor: 'shadow-amber-500/20'
    },
    {
      icon: Handshake,
      title: 'Unity',
      description: 'Together we stand — our strength lies in shared purpose and collective action.',
      gradient: 'from-green-500 to-emerald-500',
      glowColor: 'shadow-green-500/20'
    }
  ];

  const timeline = [
    {
      date: 'Dec 29, 2019',
      title: 'Vision Conceived',
      description: 'The dream of unity began',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500'
    },
    {
      date: 'Sep 11, 2023',
      title: 'Official Registration',
      description: 'Legally established as CBO',
      icon: Award,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      date: 'Sep 16, 2023',
      title: 'Grand Launch',
      description: 'Celebrated with our community',
      icon: Calendar,
      color: 'from-amber-500 to-orange-500'
    },
    {
      date: 'Today',
      title: '200+ Members Strong',
      description: 'Growing family united in purpose',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <section
      id="about"
      className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-16 sm:py-20 lg:py-28"
    >
      {/* Enhanced ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/10 via-blue-500/10 to-transparent blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-purple-500/10 via-pink-500/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <header className="mx-auto mb-16 sm:mb-20 lg:mb-24 max-w-4xl text-center">
          <div className={`inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 border border-primary/20 backdrop-blur-sm transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              About Us
            </span>
          </div>

          <h2 className={`font-serif text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-6 transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            Who We Are
          </h2>

          <p className={`text-lg sm:text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            A united family founded on the belief that{' '}
            <span className="font-semibold text-primary">service to mankind is service to God</span>.
          </p>
        </header>

        {/* History Section - Redesigned */}
        <div className="mb-20 sm:mb-24 lg:mb-32">
          <div className="grid gap-8 lg:gap-12 xl:gap-16 lg:grid-cols-2 lg:items-start">
            {/* Story Content */}
            <article className={`space-y-6 sm:space-y-8 transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}>
              <div className="space-y-4">
                <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Our Journey
                </h3>
                <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-primary to-blue-500"></div>
              </div>

              <div className="space-y-5 sm:space-y-6 text-base sm:text-lg text-gray-600 leading-relaxed">
                <p className="group">
                  The seed of Turuturu Stars CBO was planted on{' '}
                  <span className="inline-flex items-center gap-2 font-bold text-gray-900 bg-gradient-to-r from-primary/10 to-blue-500/10 px-2 py-0.5 rounded group-hover:from-primary/20 group-hover:to-blue-500/20 transition-colors">
                    <Calendar className="w-4 h-4 text-primary" />
                    29th December 2019
                  </span>
                  , born from a shared vision of unity and community transformation.
                </p>

                <p className="group">
                  After years of careful planning and dedication, we were officially registered on{' '}
                  <span className="inline-flex items-center gap-2 font-bold text-gray-900 bg-gradient-to-r from-primary/10 to-blue-500/10 px-2 py-0.5 rounded group-hover:from-primary/20 group-hover:to-blue-500/20 transition-colors">
                    <Award className="w-4 h-4 text-primary" />
                    11th September 2023
                  </span>
                  , marking a defining milestone in our collective journey.
                </p>

                <p>
                  The grand celebration took place on{' '}
                  <strong className="text-gray-900">16th September 2023</strong>, graced by the presence of Hon. Senator Veronica Maina and other distinguished leaders who championed our cause.
                </p>

                <div className="pt-4 sm:pt-6">
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br from-primary/5 via-blue-500/5 to-primary/5 border border-primary/20">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        200+
                      </p>
                      <p className="text-sm text-gray-600 font-medium">Active Members</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Timeline Card - Enhanced */}
            <aside className={`transition-all duration-700 delay-400 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}>
              <div className="relative rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-200/50 p-6 sm:p-8 lg:p-10 shadow-2xl">
                {/* Decorative elements */}
                <div className="absolute -top-3 -right-3 w-24 h-24 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-3 -left-3 w-32 h-32 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-2xl"></div>

                <div className="relative">
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    Our Timeline
                  </h4>

                  <ul className="space-y-6 sm:space-y-8">
                    {timeline.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <li key={i} className="relative group">
                          {/* Connection line */}
                          {i < timeline.length - 1 && (
                            <div className="absolute left-6 top-14 w-0.5 h-full bg-gradient-to-b from-gray-300 to-transparent"></div>
                          )}

                          <div className="flex gap-4 sm:gap-5">
                            {/* Icon */}
                            <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className="w-6 h-6 text-white" />
                              {/* Pulse effect */}
                              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} opacity-50 animate-ping`}></div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-1">
                              <p className="text-sm font-semibold text-primary mb-1">
                                {item.date}
                              </p>
                              <p className="font-bold text-gray-900 mb-1 text-base sm:text-lg">
                                {item.title}
                              </p>
                              <p className="text-sm text-gray-600">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Vision & Mission - Redesigned */}
        <div className="mb-20 sm:mb-24 lg:mb-32">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            {/* Vision Card */}
            <div className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-blue-700 p-8 sm:p-10 lg:p-12 text-white shadow-2xl hover:shadow-primary/30 transition-all duration-500 hover:-translate-y-1 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: '500ms' }}>
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-2xl"></div>
              </div>

              <div className="relative">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                  <Eye className="h-8 w-8" />
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
                  Our Vision
                </h3>

                <p className="text-base sm:text-lg leading-relaxed opacity-95">
                  To be a beacon of hope and transformation, fostering a community where every member thrives through education, unity, and shared responsibility.
                </p>

                {/* Decorative line */}
                <div className="mt-6 sm:mt-8 h-1 w-16 rounded-full bg-white/40 group-hover:w-24 transition-all duration-500"></div>
              </div>
            </div>

            {/* Mission Card */}
            <div className={`group relative overflow-hidden rounded-3xl bg-white border-2 border-gray-200 p-8 sm:p-10 lg:p-12 shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: '600ms' }}>
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 group-hover:from-primary/20 group-hover:to-blue-500/20 group-hover:scale-110 transition-all duration-500">
                  <Target className="h-8 w-8 text-primary" />
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Our Mission
                </h3>

                <p className="text-base sm:text-lg leading-relaxed text-gray-600">
                  Anchored in education, community development, and members' welfare, we promote mentorship, social capital, and holistic growth guided by the spirit of Ubuntu.
                </p>

                {/* Decorative line */}
                <div className="mt-6 sm:mt-8 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-blue-500 group-hover:w-24 transition-all duration-500"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div>
          <div className="mb-12 sm:mb-16 text-center">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">
                What Drives Us
              </span>
            </div>
            
            <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Our Core Values
            </h3>
            
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Principles that guide everything we do
            </p>
          </div>

          <div
            ref={containerRef}
            className="grid gap-5 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
          >
            {coreValues.map((value, index) => (
              <div
                key={index}
                className={`group relative overflow-hidden rounded-2xl lg:rounded-3xl bg-white border border-gray-200 p-6 sm:p-7 lg:p-8 text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${value.glowColor} hover:border-transparent ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${700 + index * 100}ms` }}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                {/* Decorative corner */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${value.gradient} opacity-5 rounded-bl-full transition-all duration-500 group-hover:w-24 group-hover:h-24`}></div>

                <div className="relative">
                  {/* Icon */}
                  <div className="mx-auto mb-5 sm:mb-6 relative">
                    <div className={`w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-2xl bg-gradient-to-br ${value.gradient} p-0.5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                      <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                        <value.icon className={`w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br ${value.gradient} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
                      </div>
                    </div>
                    {/* Pulse ring */}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${value.gradient} opacity-20 animate-ping`}></div>
                  </div>

                  {/* Title */}
                  <h4 className="mb-3 font-bold text-lg sm:text-xl text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}>
                    {value.title}
                  </h4>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {value.description}
                  </p>

                  {/* Bottom accent */}
                  <div className={`mt-6 mx-auto h-1 w-12 rounded-full bg-gradient-to-r ${value.gradient} group-hover:w-16 transition-all duration-500`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-up {
          animation: fade-up 0.6s ease-out forwards;
        }
      `}</style>
    </section>
  );
};

export default AboutSection;