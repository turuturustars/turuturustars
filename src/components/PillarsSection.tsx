import { GraduationCap, Users, Heart } from 'lucide-react';

const pillars = [
  {
    icon: GraduationCap,
    title: 'Education Development',
    description: 'Empowering the next generation through mentorship programs, scholarships, and educational resources that unlock potential and create opportunities.',
    color: 'from-primary to-primary/80',
  },
  {
    icon: Users,
    title: 'Community Development',
    description: 'Building social capital and strengthening our collective identity through collaborative initiatives that uplift and connect our community.',
    color: 'from-gold to-gold/80',
  },
  {
    icon: Heart,
    title: "Members' Welfare",
    description: 'Supporting one another in times of need and celebration, ensuring every member feels valued, cared for, and connected to our extended family.',
    color: 'from-primary to-gold',
  },
];

const PillarsSection = () => {
  return (
    <section id="pillars" className="py-24 bg-section-light relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />

      <div className="section-container relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Our Three-Fold Mandate
          </span>
          <h2 className="heading-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Pillars of Our Vision
          </h2>
          <p className="text-lg text-muted-foreground">
            Our work is firmly anchored in the spirit of Ubuntu, guiding every initiative we undertake.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="group card-elevated p-8 hover:shadow-elevated transition-all duration-500 hover:-translate-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform duration-300`}>
                <pillar.icon className="w-8 h-8 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="font-serif text-xl font-semibold text-foreground mb-4 group-hover:text-primary transition-colors">
                {pillar.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>

              {/* Decorative Line */}
              <div className={`h-1 w-0 group-hover:w-full bg-gradient-to-r ${pillar.color} mt-6 rounded-full transition-all duration-500`} />
            </div>
          ))}
        </div>

        {/* Ubuntu Quote */}
        <div className="mt-20 text-center">
          <blockquote className="relative inline-block">
            <span className="absolute -top-6 -left-4 text-6xl text-primary/20 font-serif">"</span>
            <p className="heading-display text-2xl sm:text-3xl lg:text-4xl font-medium text-foreground italic">
              I am because we are
            </p>
            <span className="absolute -bottom-4 -right-4 text-6xl text-primary/20 font-serif rotate-180">"</span>
          </blockquote>
          <p className="mt-8 text-muted-foreground font-medium">
            — Ubuntu Philosophy
          </p>
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
