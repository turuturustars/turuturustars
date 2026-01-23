import { Quote, Users, Calendar, Target, Heart } from 'lucide-react';
import chairmanImage from '@/assets/chairmain-official-photo.png';
import veronicaMaina from '@/assets/veronica_maina_member.jpg';
import veronicaConstitution from '@/assets/veronica_maina_holding_turuturustars_constititution.jpg';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const ChairmanSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const stats = [
    { icon: Users, value: '200+', label: 'Active Members', color: 'from-blue-500 to-cyan-500' },
    { icon: Calendar, value: '2019', label: 'Year Founded', color: 'from-purple-500 to-pink-500' },
    { icon: Target, value: '3', label: 'Core Pillars', color: 'from-orange-500 to-red-500' },
    { icon: Heart, value: '1', label: 'United Community', color: 'from-green-500 to-emerald-500' },
  ];

  return (
    <section
      id="leadership"
      className="relative py-16 sm:py-20 lg:py-28 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="section-container relative">
        <div
          ref={ref}
          className={`grid gap-8 lg:gap-16 xl:gap-20 lg:grid-cols-2 items-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* LEFT: Chairman Profile */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            {/* Image with decorative ring */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600 rounded-full animate-pulse opacity-20"></div>
                <img
                  src={chairmanImage}
                  alt="Francis M. Mwangi, Chairman"
                  className="relative w-44 h-44 sm:w-52 sm:h-52 lg:w-56 lg:h-56 rounded-full object-cover shadow-2xl ring-4 ring-white ring-offset-4 ring-offset-transparent transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Name and Title */}
            <div className="space-y-2">
              <h3 className="font-serif text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Francis M. Mwangi
              </h3>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary"></div>
                <p className="text-sm sm:text-base text-primary font-medium tracking-wide">
                  Chairman – Turuturu Stars CBO
                </p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary"></div>
              </div>
            </div>

            {/* Message */}
            <div className="relative max-w-xl w-full">
              <Quote className="absolute -top-3 -left-2 sm:-left-4 w-12 h-12 sm:w-14 sm:h-14 text-primary/10" />

              <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-500">
                <div className="space-y-4 sm:space-y-5">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed">
                    Warm greetings to all members, friends, and sons and daughters of Turuturu.
                    With thanksgiving to God and pride in our shared heritage, I welcome you
                    to Turuturu Stars CBO.
                  </p>

                  <p className="text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed">
                    This journey is a true testimony of unity, faith, and shared purpose.
                    I sincerely thank our founders, officials, members, partners, and supporters.
                  </p>

                  <div className="pt-4 border-t border-primary/20">
                    <p className="italic font-semibold text-base sm:text-lg text-gray-900 leading-relaxed">
                      "This is your home. Walk with us as we preserve our identity,
                      uplift one another, and build a lasting legacy."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`group relative rounded-2xl bg-white p-5 sm:p-6 lg:p-8 text-center shadow-md hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                  
                  {/* Icon */}
                  <div className="relative mb-3 flex justify-center">
                    <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10 group-hover:scale-110 transition-transform duration-500`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
                    </div>
                  </div>

                  {/* Value */}
                  <p className={`text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent mb-2 group-hover:scale-105 transition-transform duration-500`}>
                    {stat.value}
                  </p>

                  {/* Label */}
                  <p className="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors duration-300">
                    {stat.label}
                  </p>
                </div>
              );
            })}

            {/* Launch Info - Full width */}
            <div
              className={`col-span-2 relative rounded-2xl bg-gradient-to-br from-primary/5 via-white to-blue-500/5 p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-500 border border-primary/10 overflow-hidden ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>
              
              <div className="relative space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">
                    Official Launch
                  </p>
                </div>
                
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  September 16, 2023
                </p>
                
                <div className="pt-3 border-t border-primary/20">
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Presided over by <span className="font-semibold text-gray-900">Hon. Sen. Veronica Maina</span> & <span className="font-semibold text-gray-900">Hon. Joseph Munyoro, MP Kigumo</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Leadership Gallery */}
          <div className={`mt-16 sm:mt-20 pt-16 sm:pt-20 border-t border-gray-200 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}>
            <div className="text-center mb-10 sm:mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                Our Leaders
              </p>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                Visionary Leadership
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Guided by dedicated leaders championing our community's vision
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
              {/* Senator Veronica Maina */}
              <div className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-72 sm:h-80">
                <img
                  src={veronicaMaina}
                  alt="Hon. Senator Veronica Maina"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <div>
                    <h4 className="text-white font-bold text-xl">Hon. Senator Veronica Maina</h4>
                    <p className="text-gray-200 text-sm">Community Champion & Advocate</p>
                  </div>
                </div>
              </div>

              {/* Leadership with Constitution */}
              <div className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-72 sm:h-80">
                <img
                  src={veronicaConstitution}
                  alt="Leadership with Constitution"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <div>
                    <h4 className="text-white font-bold text-xl">Our Constitution</h4>
                    <p className="text-gray-200 text-sm">Foundation of our governance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChairmanSection;