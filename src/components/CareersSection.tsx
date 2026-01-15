import { useState } from 'react';
import { Briefcase, MapPin, Clock, Send, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract';
  description: string;
  requirements: string[];
  salary?: string;
}

const CareersSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: jobsRef, isVisible: jobsVisible } = useScrollAnimation();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const jobs: Job[] = [
    {
      id: '1',
      title: 'Community Outreach Coordinator',
      department: 'Community Engagement',
      location: 'Kigumo, Murang\'a',
      type: 'Full-time',
      description: 'Lead and coordinate community engagement programs, manage partnerships, and ensure our initiatives reach more members.',
      requirements: [
        'Bachelor\'s degree in Social Work, Public Health, or related field',
        'Minimum 2 years experience in community development',
        'Strong communication and leadership skills',
        'Experience with program management',
      ],
      salary: 'Competitive',
    },
    {
      id: '2',
      title: 'Finance & Administrative Officer',
      department: 'Administration',
      location: 'Kigumo, Murang\'a',
      type: 'Full-time',
      description: 'Manage financial operations, budgeting, and administrative procedures for the organization.',
      requirements: [
        'Degree in Accounting, Finance, or Business Administration',
        'Minimum 3 years in finance or accounting roles',
        'Knowledge of NGO/CBO operations',
        'Proficiency in accounting software',
      ],
      salary: 'Competitive',
    },
    {
      id: '3',
      title: 'Youth Programs Manager',
      department: 'Programs',
      location: 'Kigumo, Murang\'a',
      type: 'Full-time',
      description: 'Design, implement, and oversee youth development programs focusing on education and mentorship.',
      requirements: [
        'Bachelor\'s degree in Education, Youth Development, or related field',
        'Minimum 3 years managing youth programs',
        'Experience with curriculum development',
        'Passion for youth empowerment',
      ],
      salary: 'Competitive',
    },
    {
      id: '4',
      title: 'Volunteer Wellness Coordinator',
      department: 'Welfare',
      location: 'Kigumo, Murang\'a',
      type: 'Part-time',
      description: 'Coordinate welfare initiatives and health programs for members and beneficiaries.',
      requirements: [
        'Diploma or Degree in Health, Social Work, or related field',
        'Experience in community health programs',
        'Excellent interpersonal skills',
      ],
      salary: 'Hourly rate',
    },
    {
      id: '5',
      title: 'Digital Communications Specialist',
      department: 'Communications',
      location: 'Remote',
      type: 'Contract',
      description: 'Manage social media, website, and digital communications for the organization.',
      requirements: [
        'Degree in Communications, Marketing, or related field',
        'Minimum 2 years in digital marketing/communications',
        'Proficiency in social media platforms',
        'Content creation and graphic design skills',
      ],
      salary: 'Contract-based',
    },
    {
      id: '6',
      title: 'Research & Monitoring Officer',
      department: 'Planning & Research',
      location: 'Kigumo, Murang\'a',
      type: 'Full-time',
      description: 'Conduct research and monitoring of program outcomes, impact assessment, and data analysis.',
      requirements: [
        'Master\'s degree in Research, Development, or Statistics',
        'Experience in M&E frameworks',
        'Data analysis skills',
        'Report writing expertise',
      ],
      salary: 'Competitive',
    },
  ];

  const benefits = [
    { icon: '💼', title: 'Career Growth', description: 'Continuous learning and development opportunities' },
    { icon: '🤝', title: 'Community Impact', description: 'Make a real difference in people\'s lives' },
    { icon: '🏆', title: 'Supportive Team', description: 'Work with passionate and dedicated colleagues' },
    { icon: '⚖️', title: 'Work-Life Balance', description: 'Flexible arrangements where applicable' },
  ];

  return (
    <section id="careers" className="py-24 bg-gradient-to-br from-background via-section-accent to-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse animation-delay-300 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl animate-pulse animation-delay-500 -z-10"></div>
      <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-3xl animate-float -z-10"></div>

      <div className="section-container relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className={`inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4 transition-all duration-700 ${
            headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
          }`}>
            Join Our Team
          </span>
          <h2 className={`heading-display text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary mb-6 transition-all duration-700 animation-delay-100 ${
            headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
          }`}>
            Careers at Turuturu Stars
          </h2>
          <p className={`text-lg text-muted-foreground max-w-2xl mx-auto transition-all duration-700 animation-delay-200 ${
            headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
          }`}>
            Help us build a stronger community. Join our dedicated team and make a meaningful impact in people's lives.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-glow transition-all duration-300 animation-delay-${(index + 1) * 100} ${
                headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="text-4xl mb-3">{benefit.icon}</div>
              <h3 className="font-serif text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Job Listings */}
        <div ref={jobsRef} className="mb-16">
          <h3 className={`text-3xl font-bold text-foreground mb-8 transition-all duration-700 ${
            jobsVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
          }`}>
            Open Positions
          </h3>

          <div className="space-y-4">
            {jobs.map((job, index) => (
              <div
                key={job.id}
                className={`border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 animation-delay-${(index + 1) * 75} ${
                  jobsVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
                }`}
              >
                {/* Job Header - Always Visible */}
                <button
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  className="w-full px-6 py-5 bg-card hover:bg-accent transition-colors duration-300 flex items-center justify-between group"
                >
                  <div className="flex items-start gap-4 flex-1 text-left">
                    <div className="mt-1">
                      <Briefcase className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {job.title}
                      </h4>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.type}
                        </span>
                        <span className="inline-flex px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {job.department}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground group-hover:text-primary transition-all duration-300 flex-shrink-0 ${
                      expandedJob === job.id ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Job Details - Expandable */}
                {expandedJob === job.id && (
                  <div className="px-6 py-5 border-t border-border/50 bg-card/50 animate-fade-down">
                    <div className="mb-5">
                      <h5 className="font-semibold text-foreground mb-2">About the Role</h5>
                      <p className="text-muted-foreground leading-relaxed">{job.description}</p>
                    </div>

                    <div className="mb-5">
                      <h5 className="font-semibold text-foreground mb-3">Requirements</h5>
                      <ul className="space-y-2">
                        {job.requirements.map((req, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="text-primary font-bold">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {job.salary && (
                      <div className="mb-5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">Salary: </span>
                          <span className="text-primary">{job.salary}</span>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button className="btn-primary flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Apply Now
                      </Button>
                      <Button variant="outline">
                        Save Job
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Application CTA */}
        <div className={`text-center p-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 animation-delay-400 ${
          jobsVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
        }`}>
          <h3 className="text-3xl font-bold text-primary-foreground mb-3">
            Don't see a position that fits?
          </h3>
          <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
            Send us your CV and a cover letter. We'd love to hear about how you can contribute to our mission.
          </p>
          <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
            <Send className="w-4 h-4 mr-2" />
            Send Your Application
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CareersSection;
