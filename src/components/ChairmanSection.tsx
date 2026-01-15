import { Quote } from 'lucide-react';
import chairmanImage from '@/assets/chairmain-official-photo.png';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const ChairmanSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="leadership"
      className="py-20 bg-section-accent"
    >
      <div className="section-container">
        <div
          ref={ref}
          className={`grid gap-12 lg:grid-cols-2 items-center transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* LEFT: Chairman Profile */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <img
              src={chairmanImage}
              alt="Francis M. Mwangi, Chairman"
              className="w-40 h-40 rounded-full object-cover shadow-lg mb-6"
            />

            <h3 className="font-serif text-2xl font-semibold text-foreground">
              Francis M. Mwangi
            </h3>
            <p className="text-sm text-muted-foreground mb-8">
              Chairman – Turuturu Stars CBO
            </p>

            {/* Message */}
            <div className="relative max-w-xl">
              <Quote className="absolute -top-4 -left-4 w-10 h-10 text-primary/20" />

              <div className="pl-6 border-l-4 border-primary/40 space-y-5">
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Warm greetings to all members, friends, and sons and daughters of Turuturu.
                  With thanksgiving to God and pride in our shared heritage, I welcome you
                  to Turuturu Stars CBO.
                </p>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  This journey is a true testimony of unity, faith, and shared purpose.
                  I sincerely thank our founders, officials, members, partners, and supporters.
                </p>

                <p className="italic font-medium text-foreground">
                  “This is your home. Walk with us as we preserve our identity,
                  uplift one another, and build a lasting legacy.”
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Stats */}
          <div className="grid grid-cols-2 gap-6">
            {[
              { value: '200+', label: 'Active Members' },
              { value: '2019', label: 'Year Founded' },
              { value: '3', label: 'Core Pillars' },
              { value: '1', label: 'United Community' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-card p-6 text-center shadow-sm hover:shadow-md transition"
              >
                <p className="text-3xl font-bold text-primary">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}

            {/* Launch Info */}
            <div className="col-span-2 rounded-xl bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1">
                Official Launch
              </p>
              <p className="font-semibold text-foreground">
                September 16, 2023
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Presided over by Hon. Sen. Veronica Maina & Hon. Joseph Munyoro, MP Kigumo
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChairmanSection;
