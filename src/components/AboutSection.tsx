import { Target, Eye, Heart, Users, BookOpen, Home, Handshake } from 'lucide-react';

const AboutSection = () => {
  const coreValues = [
    {
      icon: Users,
      title: "Ubuntu",
      description: "I am because we are - our foundation is built on collective identity and mutual support."
    },
    {
      icon: Heart,
      title: "Service",
      description: "Service to mankind is service to God - we serve our community with dedication and love."
    },
    {
      icon: BookOpen,
      title: "Education",
      description: "Knowledge empowers communities - we invest in education for lasting transformation."
    },
    {
      icon: Home,
      title: "Heritage",
      description: "Preserving our identity - we honor our roots while building for future generations."
    },
    {
      icon: Handshake,
      title: "Unity",
      description: "Together we stand - our strength lies in our collective action and shared purpose."
    }
  ];

  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            About Us
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mt-2 mb-4">
            Who We Are
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A united family founded on the belief that service to mankind is service to God.
          </p>
        </div>

        {/* History Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div className="animate-fade-in">
            <h3 className="font-serif text-3xl font-bold text-foreground mb-6">
              Our History
            </h3>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The idea of Turuturu Stars CBO was first envisioned on <strong className="text-foreground">29th December 2019</strong>, 
                born from a shared vision of unity and community development among the sons and daughters of Turuturu.
              </p>
              <p>
                After years of groundwork and planning, the organization was officially registered on 
                <strong className="text-foreground"> 11th September 2023</strong>, marking a significant milestone in our journey.
              </p>
              <p>
                The formal launch took place on <strong className="text-foreground">16th September 2023</strong>, 
                graciously presided over by Hon. Senator Veronica Maina, alongside Hon. Joseph Munyoro, MP Kigumo, 
                and other esteemed leaders from our community.
              </p>
              <p>
                Today, our membership has grown to <strong className="text-foreground">over 200 members</strong>, 
                a true testimony of unity, faith, and shared purpose.
              </p>
            </div>
          </div>
          
          <div className="bg-secondary/30 rounded-2xl p-8 animate-fade-in">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-4 h-4 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-foreground">December 29, 2019</p>
                  <p className="text-muted-foreground">Vision conceived - the seed of Turuturu Stars was planted</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-4 h-4 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-foreground">September 11, 2023</p>
                  <p className="text-muted-foreground">Official registration - CBO legally established</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-4 h-4 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-foreground">September 16, 2023</p>
                  <p className="text-muted-foreground">Grand launch - presided by Hon. Senator Veronica Maina</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-4 h-4 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-foreground">Present Day</p>
                  <p className="text-muted-foreground">200+ strong members and growing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="bg-primary text-primary-foreground rounded-2xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-8 h-8" />
              <h3 className="font-serif text-2xl font-bold">Our Vision</h3>
            </div>
            <p className="leading-relaxed opacity-90">
              To be a beacon of hope and transformation in Turuturu and beyond, fostering a community 
              where every member thrives through education, development, and mutual support. We envision 
              a legacy that preserves our identity while building bridges for future generations.
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-8 h-8 text-primary" />
              <h3 className="font-serif text-2xl font-bold text-foreground">Our Mission</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Guided by our three-fold mandate—education development, community development, and members' 
              welfare—we continue to strengthen mentorship, build social capital, and promote holistic 
              community growth. Our work is firmly anchored in the spirit of Ubuntu: I am because we are.
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div className="text-center mb-12">
          <h3 className="font-serif text-3xl font-bold text-foreground mb-4">
            Our Core Values
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The principles that guide everything we do
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {coreValues.map((value, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg hover:border-primary/30 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <value.icon className="w-7 h-7 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">{value.title}</h4>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
