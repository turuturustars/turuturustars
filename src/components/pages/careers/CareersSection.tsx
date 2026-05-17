import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Clock,
  ExternalLink,
  Filter,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { supabase } from '@/integrations/supabase/client';
import { StructuredData } from '@/components/StructuredData';
import { getJobsPageSeo, JOBS_BASE_URL, JOB_SEARCH_LINKS, type JobsPageVariant } from '@/config/jobsSeo';

type JobType =
  | 'casual'
  | 'contract'
  | 'part_time'
  | 'full_time'
  | 'permanent'
  | 'temporary'
  | 'internship'
  | 'volunteer'
  | 'other';

interface Job {
  id: string;
  title: string;
  organization: string;
  location: string;
  county: string;
  job_type: JobType;
  deadline: string;
  posted_at: string;
  source_name: string;
  source_url: string;
  apply_url?: string | null;
  excerpt?: string | null;
  is_government: boolean;
  is_priority_location: boolean;
}

const jobTypeLabels: Record<JobType, string> = {
  casual: 'Casual',
  contract: 'Contract',
  part_time: 'Part-time',
  full_time: 'Full-time',
  permanent: 'Permanent',
  temporary: 'Temporary',
  internship: 'Internship',
  volunteer: 'Volunteer',
  other: 'Other',
};

const jobTypeOrder: Record<JobType, number> = {
  casual: 0,
  contract: 1,
  part_time: 2,
  full_time: 3,
  permanent: 4,
  temporary: 5,
  internship: 6,
  volunteer: 7,
  other: 8,
};

const employmentTypeSchema: Record<JobType, string> = {
  casual: 'TEMPORARY',
  contract: 'CONTRACTOR',
  part_time: 'PART_TIME',
  full_time: 'FULL_TIME',
  permanent: 'FULL_TIME',
  temporary: 'TEMPORARY',
  internship: 'INTERN',
  volunteer: 'VOLUNTEER',
  other: 'OTHER',
};

type CareersSectionProps = {
  variant?: JobsPageVariant;
  headingLevel?: 'h1' | 'h2';
};

const CareersSection = ({ variant = 'all', headingLevel = 'h2' }: CareersSectionProps) => {
  const seo = getJobsPageSeo(variant);
  const [searchParams] = useSearchParams();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation(),
    { ref: jobsRef, isVisible: jobsVisible } = useScrollAnimation();
  const initialSearch = searchParams.get('search') || '';
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<JobType | 'all'>('all');
  const [onlyMuranga, setOnlyMuranga] = useState(Boolean(seo.defaultFilters?.onlyMuranga));
  const [onlyCasual, setOnlyCasual] = useState(Boolean(seo.defaultFilters?.onlyCasual));
  const [onlyGovernment, setOnlyGovernment] = useState(Boolean(seo.defaultFilters?.onlyGovernment));
  const HeadingTag = headingLevel;

  useEffect(() => {
    setOnlyMuranga(Boolean(seo.defaultFilters?.onlyMuranga));
    setOnlyCasual(Boolean(seo.defaultFilters?.onlyCasual));
    setOnlyGovernment(Boolean(seo.defaultFilters?.onlyGovernment));
  }, [seo.defaultFilters?.onlyCasual, seo.defaultFilters?.onlyGovernment, seo.defaultFilters?.onlyMuranga, variant]);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id,title,organization,location,county,job_type,deadline,posted_at,source_name,source_url,apply_url,excerpt,is_government,is_priority_location'
        )
        .eq('status', 'approved')
        .gte('deadline', new Date().toISOString().split('T')[0])
        .order('deadline', { ascending: true })
        .limit(250);

      if (error) {
        console.error('Error loading jobs:', error);
        setErrorMessage('Unable to load jobs right now. Please try again soon.');
        setLoading(false);
        return;
      }

      setJobs((data || []) as Job[]);
      setLoading(false);
    };

    loadJobs();
  }, []);

  const normalizedJobs = useMemo(() => {
    return jobs.map((job) => {
      const isMuranga =
        job.is_priority_location ||
        job.county.toLowerCase().includes('murang') ||
        job.location.toLowerCase().includes('murang');
      return { ...job, is_priority_location: isMuranga };
    });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return normalizedJobs.filter((job) => {
      if (typeFilter !== 'all' && job.job_type !== typeFilter) return false;
      if (onlyMuranga && !job.is_priority_location) return false;
      if (onlyCasual && job.job_type !== 'casual') return false;
      if (onlyGovernment && !job.is_government) return false;
      if (!needle) return true;
      return (
        job.title.toLowerCase().includes(needle) ||
        job.organization.toLowerCase().includes(needle) ||
        job.location.toLowerCase().includes(needle) ||
        job.county.toLowerCase().includes(needle) ||
        job.source_name.toLowerCase().includes(needle)
      );
    });
  }, [normalizedJobs, search, typeFilter, onlyMuranga, onlyCasual, onlyGovernment]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      const priorityScore = (job: Job) => {
        let score = 0;
        if (job.is_priority_location) score += 3;
        if (job.job_type === 'casual') score += 2;
        if (job.is_government) score += 1;
        return score;
      };

      const scoreDiff = priorityScore(b) - priorityScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      const typeDiff = jobTypeOrder[a.job_type] - jobTypeOrder[b.job_type];
      if (typeDiff !== 0) return typeDiff;

      const deadlineDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (deadlineDiff !== 0) return deadlineDiff;

      return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
    });
  }, [filteredJobs]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-KE', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const daysLeft = (value: string) => {
    const now = new Date();
    const deadline = new Date(value);
    const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Closes today';
    if (diff === 1) return '1 day left';
    return `${diff} days left`;
  };

  const jobSchema = useMemo(() => {
    const topJobs = sortedJobs.slice(0, 25);
    return {
      itemListElement: topJobs.map((job, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${JOBS_BASE_URL}/jobs/${job.id}`,
        name: `${job.title} at ${job.organization}`,
        description: job.excerpt || `${job.title} in ${job.location}`,
        item: {
          '@type': 'JobPosting',
          title: job.title,
          description: job.excerpt || `${job.title} opportunity at ${job.organization} in ${job.location}.`,
          datePosted: job.posted_at,
          validThrough: `${job.deadline}T23:59:59+03:00`,
          employmentType: employmentTypeSchema[job.job_type],
          url: `${JOBS_BASE_URL}/jobs/${job.id}`,
          hiringOrganization: {
            '@type': 'Organization',
            name: job.organization,
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.location,
              addressRegion: job.county,
              addressCountry: 'KE',
            },
          },
        },
      })),
    };
  }, [sortedJobs]);

  return (
    <section
      id="careers"
      className="py-24 bg-gradient-to-br from-background via-section-accent to-background relative overflow-hidden"
    >
      <StructuredData data={jobSchema} type="ItemList" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse animation-delay-300 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl animate-pulse animation-delay-500 -z-10"></div>
      <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-3xl animate-float -z-10"></div>

      <div className="section-container relative z-10">
        <div ref={headerRef} className="text-center mb-16">
          <span
            className={`inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4 transition-all duration-700 ${
              headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
            }`}
          >
            {seo.eyebrow}
          </span>
          <HeadingTag
            className={`heading-display text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary mb-6 transition-all duration-700 animation-delay-100 ${
              headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
            }`}
          >
            {seo.heading}
          </HeadingTag>
          <p
            className={`text-lg text-muted-foreground max-w-2xl mx-auto transition-all duration-700 animation-delay-200 ${
              headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
            }`}
          >
            {seo.intro} We do not hire directly; each listing points to the original trusted source.
          </p>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="p-5 rounded-2xl bg-card border border-border/50 flex items-start gap-3">
            <Landmark className="w-6 h-6 text-primary mt-1" />
            <div>
              <p className="text-sm font-semibold text-foreground">Government and County Jobs</p>
              <p className="text-sm text-muted-foreground">
                We prioritize official county and national government listings.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border/50 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-primary mt-1" />
            <div>
              <p className="text-sm font-semibold text-foreground">Murang'a First</p>
              <p className="text-sm text-muted-foreground">
                Jobs in Murang'a stay at the top so locals see them first.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border/50 flex items-start gap-3">
            <Briefcase className="w-6 h-6 text-primary mt-1" />
            <div>
              <p className="text-sm font-semibold text-foreground">Casual Jobs Prioritized</p>
              <p className="text-sm text-muted-foreground">
                Casual work appears before other listings to help people start quickly.
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="Job search categories" className="mb-12 grid gap-3 md:grid-cols-4">
          {JOB_SEARCH_LINKS.map((link) => {
            const isActive = link.href === seo.canonicalPath;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-xl border p-4 transition hover:border-primary/60 hover:bg-primary/5 ${
                  isActive ? 'border-primary bg-primary/10' : 'border-border/60 bg-card/60'
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">{link.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{link.description}</span>
              </Link>
            );
          })}
        </nav>

        <div ref={jobsRef} className="mb-16">
          <div
            className={`flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8 transition-all duration-700 ${
              jobsVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
            }`}
          >
            <h3 className="text-3xl font-bold text-foreground">Available Opportunities</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setOnlyMuranga((prev) => !prev)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  onlyMuranga ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                Murang'a first
              </button>
              <button
                onClick={() => setOnlyCasual((prev) => !prev)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  onlyCasual ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                Casual only
              </button>
              <button
                onClick={() => setOnlyGovernment((prev) => !prev)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  onlyGovernment ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                Government only
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={seo.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as JobType | 'all')}
                className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">All job types</option>
                {Object.entries(jobTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="grid gap-4">
                {[0, 1, 2].map((index) => (
                  <div
                    key={`job-skeleton-${index}`}
                    className="border border-border/50 rounded-xl p-6 bg-card/60 animate-pulse"
                  >
                    <div className="h-4 w-1/3 bg-muted rounded mb-3"></div>
                    <div className="h-3 w-1/2 bg-muted rounded mb-4"></div>
                    <div className="h-3 w-full bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {!loading && errorMessage && (
              <div className="border border-border/50 rounded-xl p-6 bg-card text-sm text-muted-foreground">
                {errorMessage}
              </div>
            )}

            {!loading && !errorMessage && sortedJobs.length === 0 && (
              <div className="border border-dashed border-border/70 rounded-2xl p-10 text-center bg-card/50">
                <p className="text-lg font-semibold text-foreground mb-2">No jobs found right now</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting filters or check back soon. We refresh listings regularly.
                </p>
              </div>
            )}

            {!loading &&
              !errorMessage &&
              sortedJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`border border-border/50 rounded-xl p-6 bg-card/70 hover:border-primary/40 transition-all duration-300 animation-delay-${
                    (index + 1) * 75
                  } ${jobsVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {job.is_priority_location && (
                          <span className="inline-flex px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            Murang'a Priority
                          </span>
                        )}
                        {job.job_type === 'casual' && (
                          <span className="inline-flex px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            Casual
                          </span>
                        )}
                        {job.is_government && (
                          <span className="inline-flex px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                            Government
                          </span>
                        )}
                        <span className="inline-flex px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                          {jobTypeLabels[job.job_type]}
                        </span>
                      </div>

                      <h4 className="text-lg font-semibold text-foreground">
                        <Link to={`/jobs/${job.id}`} className="hover:text-primary hover:underline">
                          {job.title}
                        </Link>
                      </h4>
                      <p className="text-sm text-muted-foreground">{job.organization}</p>

                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location} - {job.county}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Closes {formatDate(job.deadline)} - {daysLeft(job.deadline)}
                        </span>
                      </div>

                      {job.excerpt && (
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{job.excerpt}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:min-w-[180px]">
                      <Button asChild className="btn-primary">
                        <a href={job.apply_url || job.source_url} target="_blank" rel="noreferrer">
                          Apply Now
                        </a>
                      </Button>
                      <Button asChild variant="secondary">
                        <Link to={`/jobs/${job.id}`}>Job Details</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <a href={job.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                          View Source
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">Source: {job.source_name}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div
          className={`mt-16 pt-10 border-t border-border/60 transition-all duration-700 ${
            jobsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h4 className="text-lg font-semibold text-foreground mb-2">How listings work</h4>
              <p className="text-sm text-muted-foreground">
                Listings are pulled from official sources and trusted job boards, including Government of Kenya,
                county government, public service, and reputable employment sources. Expired jobs are removed
                automatically to keep the page light and accurate.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h4 className="text-lg font-semibold text-foreground mb-2">Looking for Murang'a jobs?</h4>
              <p className="text-sm text-muted-foreground">
                Use the Murang'a jobs filter for casual work, county opportunities, internships, and public jobs near
                Turuturu, Kigumo, Githima, and nearby areas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareersSection;
