import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Briefcase, Clock, ExternalLink, MapPin } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { StructuredData } from '@/components/StructuredData';
import { JOB_SEARCH_LINKS } from '@/config/jobsSeo';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';

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

type Job = {
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
};

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

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-KE', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const JobDetail = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) {
        setErrorMessage('Job not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id,title,organization,location,county,job_type,deadline,posted_at,source_name,source_url,apply_url,excerpt,is_government,is_priority_location'
        )
        .eq('id', jobId)
        .eq('status', 'approved')
        .gte('deadline', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (error) {
        console.error('Error loading job:', error);
        setErrorMessage('Unable to load this job right now.');
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage('This job is no longer available or has expired.');
        setLoading(false);
        return;
      }

      setJob(data as Job);
      setLoading(false);
    };

    loadJob();
  }, [jobId]);

  const pageTitle = job
    ? `${job.title} at ${job.organization} | Jobs in ${job.county}`
    : 'Job Opportunity | Turuturu Stars Jobs';
  const description = job
    ? `${job.title} at ${job.organization} in ${job.location}, ${job.county}. Apply through the verified source before ${formatDate(job.deadline)}.`
    : "View verified Kenya jobs, Government of Kenya jobs, public jobs, and Murang'a opportunities from Turuturu Stars.";

  usePageMeta({
    title: pageTitle,
    description,
    keywords: job
      ? [
          job.title,
          `${job.organization} jobs`,
          `${job.county} jobs`,
          `${job.location} jobs`,
          'jobs in Kenya',
          'Government of Kenya jobs',
          'public jobs Kenya',
          "Murang'a jobs",
        ]
      : ['jobs in Kenya', 'job search Kenya', 'Government of Kenya jobs', "Murang'a jobs"],
    canonicalUrl: jobId ? `https://turuturustars.co.ke/jobs/${jobId}` : 'https://turuturustars.co.ke/jobs',
    ogImage: 'https://img.icons8.com/nolan/256/star.png',
    ogType: 'website',
  });

  const jobSchema = useMemo(() => {
    if (!job) return null;

    return {
      title: job.title,
      description: job.excerpt || description,
      datePosted: job.posted_at,
      validThrough: `${job.deadline}T23:59:59+03:00`,
      employmentType: employmentTypeSchema[job.job_type],
      url: `https://turuturustars.co.ke/jobs/${job.id}`,
      directApply: false,
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
      applicantLocationRequirements: {
        '@type': 'Country',
        name: 'Kenya',
      },
    };
  }, [description, job]);

  return (
    <div className="min-h-screen bg-background">
      {jobSchema && <StructuredData data={jobSchema} type="JobPosting" />}
      <Header />
      <main className="section-container pt-32 pb-20">
        <Link to="/jobs" className="text-sm font-semibold text-primary hover:underline">
          Back to all jobs
        </Link>

        <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
            {loading && <p className="text-sm text-muted-foreground">Loading job...</p>}

            {!loading && errorMessage && (
              <div>
                <h1 className="text-3xl font-bold text-foreground">Job not available</h1>
                <p className="mt-3 text-muted-foreground">{errorMessage}</p>
                <Button asChild className="mt-6">
                  <Link to="/jobs">Browse current jobs</Link>
                </Button>
              </div>
            )}

            {!loading && job && (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  {job.is_government && (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Government
                    </span>
                  )}
                  {job.is_priority_location && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      Murang'a Priority
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {jobTypeLabels[job.job_type]}
                  </span>
                </div>

                <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">{job.title}</h1>
                <p className="mt-3 text-lg text-muted-foreground">{job.organization}</p>

                <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {job.location}, {job.county}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Apply by {formatDate(job.deadline)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {jobTypeLabels[job.job_type]}
                  </span>
                </div>

                <div className="mt-8 border-t border-border/60 pt-6">
                  <h2 className="text-xl font-semibold text-foreground">Job summary</h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {job.excerpt ||
                      `${job.title} opportunity at ${job.organization} in ${job.location}, ${job.county}. Use the verified source link to review full requirements and application instructions.`}
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="btn-primary">
                    <a href={job.apply_url || job.source_url} target="_blank" rel="noreferrer">
                      Apply Now
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={job.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                      View Original Source
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Source: {job.source_name}. Turuturu Stars shares verified listings for community access and does not
                  receive applications directly.
                </p>
              </>
            )}
          </article>

          <aside className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">More job searches</h2>
            <div className="mt-4 grid gap-3">
              {JOB_SEARCH_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="rounded-xl border border-border/60 p-3 transition hover:border-primary/60 hover:bg-primary/5"
                >
                  <span className="block text-sm font-semibold text-foreground">{link.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{link.description}</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default JobDetail;
