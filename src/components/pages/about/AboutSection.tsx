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
import { useState, useEffect, useRef } from 'react';

const AboutSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const coreValues = [
    {
      icon: Users,
      title: 'Ubuntu',
      description: 'I am because we are — our foundation is built on collective identity and mutual support.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Heart,
      title: 'Service',
      description: 'Service to mankind is service to God — we serve with dedication and compassion.',
      gradient: 'from-rose-500 to-pink-500'
    },
    {
      icon: BookOpen,
      title: 'Education',
      description: 'Knowledge empowers communities — we invest in learning for lasting transformation.',
      gradient: 'from-purple-500 to-violet-500'
    },
    {
      icon: Home,
      title: 'Heritage',
      description: 'Preserving our identity — honoring our roots while building for future generations.',
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      icon: Handshake,
      title: 'Unity',
      description: 'Together we stand — our strength lies in shared purpose and collective action.',
      gradient: 'from-green-500 to-emerald-500'
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
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12 sm:py-16 lg:py-24"
    >
      {/* Simplified background - only 1 element */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-12 sm:mb-16 max-w-3xl text-center">
          <div className={`inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
              About Us
            </span>
          </div>

          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-500 delay-75 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            Who We Are
          </h2>

          <p className={`text-lg sm:text-xl text-gray-600 transition-all duration-500 delay-150 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            A united family founded on the belief that{' '}
            <span className="font-semibold text-blue-600">service to mankind is service to God</span>.
          </p>
        </div>

        {/* History Section */}
        <div className="mb-16 sm:mb-20">
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-2">
            {/* Story Content */}
            <div className={`space-y-6 transition-all duration-500 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}>
              <div className="space-y-3">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  Our Journey
                </h3>
                <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-400"></div>
              </div>

              <div className="space-y-4 text-base sm:text-lg text-gray-700">
                <p>
                  The seed of Turuturu Stars CBO was planted on{' '}
                  <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    29th December 2019</span>, born from a shared vision of unity and community transformation.
                </p>

                <p>
                  After years of careful planning and dedication, we were officially registered on{' '}
                  <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                    <Award className="w-4 h-4 text-blue-600" />
                    11th September 2023</span>, marking a defining milestone in our collective journey.
                </p>

                <p>
                  The grand celebration took place on{' '}
                  <strong className="text-gray-900">16th September 2023</strong>, graced by the presence of Hon. Senator Veronica Maina and other distinguished leaders who championed our cause.
                </p>

                <div className="pt-4">
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-50 border border-blue-200">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-3xl font-bold text-blue-600">200+</p>
                      <p className="text-sm text-gray-600 font-medium">Active Members</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className={`transition-all duration-500 delay-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}>
              <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-lg">
                <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Our Timeline
                </h4>

                <div className="space-y-6">
                  {timeline.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={`timeline-${i}-${item.title}`} className="relative flex gap-4 group">
                        {i < timeline.length - 1 && (
                          <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200"></div>
                        )}

                        <div className={`relative flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-semibold text-blue-600 mb-0.5">
                            {item.date}
                          </p>
                          <p className="font-bold text-gray-900 mb-0.5">
                            {item.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="mb-16 sm:mb-20">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Vision Card */}
            <div className={`rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 sm:p-10 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: '400ms' }}>
              <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/20">
                <Eye className="h-7 w-7" />
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Our Vision
              </h3>

              <p className="text-base sm:text-lg leading-relaxed opacity-95">
                To be a beacon of hope and transformation, fostering a community where every member thrives through education, unity, and shared responsibility.
              </p>

              <div className="mt-6 h-1 w-12 rounded-full bg-white/40"></div>
            </div>

            {/* Mission Card */}
            <div className={`rounded-2xl bg-white border-2 border-gray-200 p-8 sm:p-10 shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: '450ms' }}>
              <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50">
                <Target className="h-7 w-7 text-blue-600" />
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Our Mission
              </h3>

              <p className="text-base sm:text-lg leading-relaxed text-gray-600">
                Anchored in education, community development, and members' welfare, we promote mentorship, social capital, and holistic growth guided by the spirit of Ubuntu.
              </p>

              <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-400"></div>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div>
          <div className="mb-10 sm:mb-12 text-center">
            <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
              <Heart className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                What Drives Us
              </span>
            </div>
            
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Our Core Values
            </h3>
            
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Principles that guide everything we do
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {coreValues.map((value, index) => (
              <div
                key={`core-value-${value.title}`}
                className={`group rounded-xl lg:rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 text-center hover:shadow-lg hover:border-gray-300 transition-all duration-300 hover:-translate-y-1 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${500 + index * 50}ms` }}
              >
                <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-gradient-to-br {value.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <value.icon className="w-7 h-7 text-white" />
                </div>

                <h4 className="mb-2 font-bold text-lg text-gray-900">
                  {value.title}
                </h4>

                <p className="text-sm text-gray-600 leading-relaxed">
                  {value.description}
                </p>

                <div className={`mt-4 mx-auto h-0.5 w-8 rounded-full bg-gradient-to-r ${value.gradient} group-hover:w-12 transition-all duration-300`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;