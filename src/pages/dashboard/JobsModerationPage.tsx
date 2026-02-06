import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

const jobTypes = [
  'casual',
  'contract',
  'part_time',
  'full_time',
  'permanent',
  'temporary',
  'internship',
  'volunteer',
  'other',
] as const;

type JobType = (typeof jobTypes)[number];

type JobRecord = {
  id: string;
  title: string;
  organization: string;
  location: string;
  county: string;
  job_type: JobType;
  deadline: string | null;
  posted_at: string;
  source_name: string;
  source_url: string;
  apply_url: string | null;
  excerpt: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejected_reason: string | null;
};

type DraftState = {
  deadline?: string;
  job_type?: JobType;
  rejected_reason?: string;
};

const JobsModerationPage = () => {
  const { status, showError, showSuccess } = useStatus();
  const { isOfficial, user } = useAuth();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pending' | 'rejected' | 'all'>('pending');
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  const canManage = isOfficial();

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    fetchJobs();
  }, [canManage, view]);

  const fetchJobs = async () => {
    setLoading(true);
    const query = (supabase.from('jobs' as never) as any)
      .select(
        'id,title,organization,location,county,job_type,deadline,posted_at,source_name,source_url,apply_url,excerpt,status,rejected_reason'
      )
      .order('posted_at', { ascending: false });

    if (view === 'pending') {
      query.eq('status', 'pending');
    } else if (view === 'rejected') {
      query.eq('status', 'rejected');
    }

    const { data, error } = await query;
    if (error) {
      showError('Failed to load jobs for review.', 3000);
      setLoading(false);
      return;
    }

    setJobs((data || []) as JobRecord[]);
    setLoading(false);
  };

  const updateDraft = (jobId: string, patch: DraftState) => {
    setDrafts((prev) => ({
      ...prev,
      [jobId]: { ...prev[jobId], ...patch },
    }));
  };

  const formatDateInput = (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDeadlineIso = (dateValue: string) => {
    if (!dateValue) return null;
    return new Date(`${dateValue}T23:59:59+03:00`).toISOString();
  };

  const handleApprove = async (job: JobRecord) => {
    const draft = drafts[job.id] || {};
    const deadlineValue = draft.deadline ?? formatDateInput(job.deadline);
    if (!deadlineValue) {
      showError('Set a deadline before approving.', 3000);
      return;
    }

    const updates = {
      status: 'approved',
      deadline: toDeadlineIso(deadlineValue),
      job_type: draft.job_type ?? job.job_type,
      approved_at: new Date().toISOString(),
      approved_by: user?.id ?? null,
      rejected_reason: null,
    };

    const { error } = await (supabase.from('jobs' as never) as any)
      .update(updates)
      .eq('id', job.id);

    if (error) {
      showError('Failed to approve job.', 3000);
      return;
    }

    showSuccess('Job approved and published.', 2500);
    fetchJobs();
  };

  const handleReject = async (job: JobRecord) => {
    const draft = drafts[job.id] || {};
    const reason = (draft.rejected_reason || '').trim();

    const { error } = await (supabase.from('jobs' as never) as any)
      .update({
        status: 'rejected',
        rejected_reason: reason || 'Not a valid job listing.',
        approved_at: null,
        approved_by: null,
      })
      .eq('id', job.id);

    if (error) {
      showError('Failed to reject job.', 3000);
      return;
    }

    showSuccess('Job rejected.', 2500);
    fetchJobs();
  };

  const summary = useMemo(() => {
    return {
      pending: jobs.filter((job) => job.status === 'pending').length,
      rejected: jobs.filter((job) => job.status === 'rejected').length,
      total: jobs.length,
    };
  }, [jobs]);

  if (!canManage) {
    return (
      <div className="space-y-4">
        <AccessibleStatus message={status.message} type={status.type} isVisible={status.isVisible} />
        <Card>
          <CardHeader>
            <CardTitle>Jobs Moderation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You do not have permission to review job listings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <AccessibleStatus message={status.message} type={status.type} isVisible={status.isVisible} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Review incoming job listings before they appear on the public board.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Pending: {summary.pending}</Badge>
          <Badge variant="secondary">Rejected: {summary.rejected}</Badge>
          <Badge variant="secondary">Loaded: {summary.total}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={view === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('pending')}
        >
          Pending
        </Button>
        <Button
          variant={view === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('rejected')}
        >
          Rejected
        </Button>
        <Button
          variant={view === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('all')}
        >
          All
        </Button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading job listings...</div>}

      {!loading && jobs.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No jobs to review right now.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="border border-border/60">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">{job.title}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {job.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {job.organization} • {job.location} • {job.county}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Source: <a className="text-primary underline" href={job.source_url} target="_blank" rel="noreferrer">{job.source_name}</a>
              </div>

              {job.excerpt && (
                <p className="text-sm text-muted-foreground">{job.excerpt}</p>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Deadline</label>
                  <Input
                    type="date"
                    value={drafts[job.id]?.deadline ?? formatDateInput(job.deadline)}
                    onChange={(event) => updateDraft(job.id, { deadline: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Job Type</label>
                  <select
                    value={drafts[job.id]?.job_type ?? job.job_type}
                    onChange={(event) => updateDraft(job.id, { job_type: event.target.value as JobType })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {jobTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Reject Reason</label>
                  <Input
                    type="text"
                    placeholder="Optional reason"
                    value={drafts[job.id]?.rejected_reason ?? job.rejected_reason ?? ''}
                    onChange={(event) => updateDraft(job.id, { rejected_reason: event.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handleApprove(job)}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleReject(job)}
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                  onClick={() => updateDraft(job.id, { deadline: '', rejected_reason: '' })}
                >
                  <Clock className="w-4 h-4" />
                  Clear Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JobsModerationPage;
