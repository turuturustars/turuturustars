import { Quote } from 'lucide-react';
import chairmanImage from '@/assets/chairmain-official-photo.png';

const ChairmanSection = () => {
  return (
    <section id="leadership" className="py-24 bg-gradient-to-b from-background to-section-accent relative">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Message Content */}
          <div className="order-2 lg:order-1">
            <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              From The Chairman
            </span>
            <h2 className="heading-display text-3xl sm:text-4xl font-bold text-foreground mb-8">
              A Message of Unity & Hope
            </h2>

            <div className="relative">
              <Quote className="absolute -top-4 -left-4 w-12 h-12 text-primary/20" />
              <div className="pl-8 border-l-4 border-primary/30">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Warm greetings to all members, friends, and sons and daughters of Turuturu. 
                  With thanksgiving to God and pride in our shared heritage, I warmly welcome you 
                  to Turuturu Stars CBO.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  This journey is a true testimony of unity, faith, and shared purpose. 
                  I sincerely thank our founders, officials, members, leaders, partners, and supporters. 
                  Your commitment has shaped who we are today.
                </p>
                <p className="text-lg text-foreground font-medium italic">
                  "To all alumni and friends yet to join us—this is your home. Walk with us as we preserve 
                  our identity, uplift one another, and build a lasting legacy for present and future generations."
                </p>
              </div>
            </div>

            {/* Signature with Image */}
            <div className="mt-10 flex items-center gap-4">
              <img 
                src={chairmanImage}
                alt="Francis M. Mwangi, Chairman"
                className="w-16 h-16 rounded-full object-cover shadow-elevated border-2 border-primary/30"
              />
              <div>
                <p className="font-serif text-lg font-semibold text-foreground">
                  Francis M. Mwangi
                </p>
                <p className="text-sm text-muted-foreground">
                  Chairman – Turuturu Stars CBO
                </p>
              </div>
            </div>
          </div>

          {/* Stats Card with Chairman Photo */}
          <div className="order-1 lg:order-2 flex flex-col gap-8">
            {/* Chairman Photo */}
            <div className="rounded-2xl overflow-hidden shadow-elevated">
              <img 
                src={chairmanImage}
                alt="Francis M. Mwangi, Chairman"
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
              />
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-center">
                <p className="font-serif text-lg font-semibold text-primary-foreground">
                  Francis M. Mwangi
                </p>
                <p className="text-sm text-primary-foreground/90">
                  Chairman – Turuturu Stars CBO
                </p>
              </div>
            </div>

            {/* Stats Card */}
            <div className="card-elevated p-8 lg:p-10 bg-gradient-to-br from-card to-section-light">
              <h3 className="font-serif text-2xl font-semibold text-foreground mb-8 text-center">
                Our Journey in Numbers
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <p className="heading-display text-4xl lg:text-5xl font-bold text-primary">200+</p>
                  <p className="text-sm text-muted-foreground mt-2">Active Members</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-gold/10 hover:bg-gold/15 transition-colors">
                  <p className="heading-display text-4xl lg:text-5xl font-bold text-gold">2019</p>
                  <p className="text-sm text-muted-foreground mt-2">Year Founded</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-gold/10 hover:bg-gold/15 transition-colors">
                  <p className="heading-display text-4xl lg:text-5xl font-bold text-gold">3</p>
                  <p className="text-sm text-muted-foreground mt-2">Core Pillars</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <p className="heading-display text-4xl lg:text-5xl font-bold text-primary">1</p>
                  <p className="text-sm text-muted-foreground mt-2">United Family</p>
                </div>
              </div>

              {/* Launch Event */}
              <div className="mt-8 p-6 rounded-2xl border border-border bg-card/50">
                <p className="text-sm text-muted-foreground mb-2">Official Launch</p>
                <p className="font-serif text-lg font-semibold text-foreground">
                  September 16, 2023
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Presided over by Hon. Senator Veronica Maina & Hon. Joseph Munyoro, MP Kigumo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChairmanSection;
