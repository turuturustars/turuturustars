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
      className="relative overflow-hidden bg-[#eef6f2] py-20 sm:py-24"
    >
      <StructuredData data={jobSchema} type="ItemList" />

      <div className="section-container relative z-10">
        <div
          ref={headerRef}
          className="mb-12 grid gap-8 border-b border-[#b9d3d5] pb-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-end"
        >
          <div>
            <span
              className={`mb-4 inline-block text-sm font-black uppercase text-[#0b6f95] transition-all duration-700 ${
                headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
              }`}
            >
              {seo.eyebrow}
            </span>
            <HeadingTag
              className={`heading-display mb-5 max-w-4xl text-4xl font-bold text-[#09253a] transition-all duration-700 md:text-5xl ${
                headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
              }`}
            >
              {seo.heading}
            </HeadingTag>
            <p
              className={`max-w-3xl text-base leading-8 text-[#415b6a] transition-all duration-700 md:text-lg ${
                headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
              }`}
            >
              {seo.intro} We do not hire directly; every listing keeps a link back to the original source.
            </p>
          </div>

          <div
            className={`border-l-4 border-[#f1c762] bg-white/70 p-5 transition-all duration-700 ${
              headerVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
            }`}
          >
            <p className="text-sm font-black uppercase text-[#09253a]">For the community</p>
            <p className="mt-2 text-sm leading-7 text-[#526274]">
              Government, public, casual, and Murang'a opportunities are grouped so people can scan quickly and apply from the official source.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-3">
          <div className="flex items-start gap-3 border border-[#c8dcdd] bg-white/80 p-4">
            <Landmark className="mt-1 h-5 w-5 text-[#0b6f95]" />
            <div>
              <p className="text-sm font-black text-[#09253a]">Government and County Jobs</p>
              <p className="text-sm leading-6 text-[#526274]">
                We prioritize official county and national government listings.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 border border-[#c8dcdd] bg-white/80 p-4">
            <ShieldCheck className="mt-1 h-5 w-5 text-[#0b6f95]" />
            <div>
              <p className="text-sm font-black text-[#09253a]">Murang'a First</p>
              <p className="text-sm leading-6 text-[#526274]">
                Jobs in Murang'a stay at the top so locals see them first.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 border border-[#c8dcdd] bg-white/80 p-4">
            <Briefcase className="mt-1 h-5 w-5 text-[#0b6f95]" />
            <div>
              <p className="text-sm font-black text-[#09253a]">Casual Jobs Prioritized</p>
              <p className="text-sm leading-6 text-[#526274]">
                Casual work appears before other listings to help people start quickly.
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="Job search categories" className="mb-12 grid overflow-hidden border border-[#c8dcdd] bg-white md:grid-cols-4">
          {JOB_SEARCH_LINKS.map((link) => {
            const isActive = link.href === seo.canonicalPath;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`border-b border-[#d6e4e5] p-4 transition hover:bg-[#f7fbfb] md:border-b-0 md:border-r md:last:border-r-0 ${
                  isActive ? 'bg-[#09253a] text-white' : 'text-[#09253a]'
                }`}
              >
                <span className="block text-sm font-black">{link.label}</span>
                <span className={`mt-1 block text-xs leading-relaxed ${isActive ? 'text-white/72' : 'text-[#526274]'}`}>
                  {link.description}
                </span>
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
            <h3 className="text-3xl font-bold text-[#09253a]">Available Opportunities</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setOnlyMuranga((prev) => !prev)}
                className={`rounded-md border px-3 py-1.5 text-xs font-black transition ${
                  onlyMuranga ? 'border-[#09253a] bg-[#09253a] text-white' : 'border-[#b9d3d5] bg-white text-[#526274]'
                }`}
              >
                Murang'a first
              </button>
              <button
                onClick={() => setOnlyCasual((prev) => !prev)}
                className={`rounded-md border px-3 py-1.5 text-xs font-black transition ${
                  onlyCasual ? 'border-[#09253a] bg-[#09253a] text-white' : 'border-[#b9d3d5] bg-white text-[#526274]'
                }`}
              >
                Casual only
              </button>
              <button
                onClick={() => setOnlyGovernment((prev) => !prev)}
                className={`rounded-md border px-3 py-1.5 text-xs font-black transition ${
                  onlyGovernment ? 'border-[#09253a] bg-[#09253a] text-white' : 'border-[#b9d3d5] bg-white text-[#526274]'
                }`}
              >
                Government only
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526274]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={seo.searchPlaceholder}
                className="w-full rounded-md border border-[#b9d3d5] bg-white py-2.5 pl-10 pr-4 text-sm text-[#09253a] focus:outline-none focus:ring-2 focus:ring-[#0b6f95]/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#526274]" />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as JobType | 'all')}
                className="rounded-md border border-[#b9d3d5] bg-white px-3 py-2 text-sm text-[#09253a] focus:outline-none focus:ring-2 focus:ring-[#0b6f95]/30"
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
                    className="animate-pulse border border-[#c8dcdd] bg-white/70 p-6"
                  >
                    <div className="mb-3 h-4 w-1/3 rounded bg-[#dbe8e8]"></div>
                    <div className="mb-4 h-3 w-1/2 rounded bg-[#dbe8e8]"></div>
                    <div className="h-3 w-full rounded bg-[#dbe8e8]"></div>
                  </div>
                ))}
              </div>
            )}

            {!loading && errorMessage && (
              <div className="border border-[#c8dcdd] bg-white p-6 text-sm text-[#526274]">
                {errorMessage}
              </div>
            )}

            {!loading && !errorMessage && sortedJobs.length === 0 && (
              <div className="border border-dashed border-[#b9d3d5] bg-white/60 p-10 text-center">
                <p className="mb-2 text-lg font-black text-[#09253a]">No jobs found right now</p>
                <p className="text-sm text-[#526274]">
                  Try adjusting filters or check back soon. We refresh listings regularly.
                </p>
              </div>
            )}

            {!loading &&
              !errorMessage &&
              sortedJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`border-l-4 border-[#0b6f95] bg-white p-5 shadow-sm transition-all duration-300 hover:border-l-[#f1c762] hover:shadow-md ${
                    jobsVisible ? 'animate-fade-up' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${Math.min(index, 6) * 70}ms` }}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {job.is_priority_location && (
                          <span className="inline-flex rounded bg-[#e4f0f1] px-2 py-1 text-xs font-black text-[#0b6f95]">
                            Murang'a Priority
                          </span>
                        )}
                        {job.job_type === 'casual' && (
                          <span className="inline-flex rounded bg-[#fff4cc] px-2 py-1 text-xs font-black text-[#775b00]">
                            Casual
                          </span>
                        )}
                        {job.is_government && (
                          <span className="inline-flex rounded bg-[#def4e7] px-2 py-1 text-xs font-black text-[#146239]">
                            Government
                          </span>
                        )}
                        <span className="inline-flex rounded bg-[#eef2f2] px-2 py-1 text-xs font-black text-[#526274]">
                          {jobTypeLabels[job.job_type]}
                        </span>
                      </div>

                      <h4 className="text-lg font-black leading-snug text-[#09253a]">
                        <Link to={`/jobs/${job.id}`} className="hover:text-[#0b6f95] hover:underline">
                          {job.title}
                        </Link>
                      </h4>
                      <p className="text-sm text-[#526274]">{job.organization}</p>

                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#526274]">
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
                        <p className="mt-3 text-sm leading-relaxed text-[#526274]">{job.excerpt}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:min-w-[180px]">
                      <Button asChild className="rounded-md bg-[#0b6f95] text-white hover:bg-[#09253a]">
                        <a href={job.apply_url || job.source_url} target="_blank" rel="noreferrer">
                          Apply Now
                        </a>
                      </Button>
                      <Button asChild variant="secondary" className="rounded-md">
                        <Link to={`/jobs/${job.id}`}>Job Details</Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-md">
                        <a href={job.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                          View Source
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <p className="text-center text-xs text-[#526274]">Source: {job.source_name}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div
          className={`mt-16 border-t border-[#b9d3d5] pt-10 transition-all duration-700 ${
            jobsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-[#c8dcdd] bg-white/80 p-6">
              <h4 className="mb-2 text-lg font-black text-[#09253a]">How listings work</h4>
              <p className="text-sm leading-7 text-[#526274]">
                Listings are pulled from official sources and trusted job boards, including Government of Kenya,
                county government, public service, and reputable employment sources. Expired jobs are removed
                automatically to keep the page light and accurate.
              </p>
            </div>
            <div className="border border-[#c8dcdd] bg-white/80 p-6">
              <h4 className="mb-2 text-lg font-black text-[#09253a]">Looking for Murang'a jobs?</h4>
              <p className="text-sm leading-7 text-[#526274]">
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
