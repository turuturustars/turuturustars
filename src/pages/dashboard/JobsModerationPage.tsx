import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, Clock, Trash2, XCircle } from 'lucide-react';

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

type ScrapeSettings = {
  id: number;
  max_per_source: number;
  request_delay_ms: number;
  job_max_priority: number;
  updated_at: string | null;
};

type ScrapeSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  priority: number;
  is_active: boolean;
  created_at: string;
};

type ScrapeSourceDraft = {
  name: string;
  url: string;
  category: string;
  priority: string;
};

const defaultSourceDraft: ScrapeSourceDraft = {
  name: '',
  url: '',
  category: 'other',
  priority: '3',
};

const defaultSettingsDraft = {
  max_per_source: '20',
  request_delay_ms: '1200',
  job_max_priority: '2',
};

const JobsModerationPage = () => {
  const { status, showError, showSuccess } = useStatus();
  const { hasRole, isOfficial, user } = useAuth();

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pending' | 'rejected' | 'all'>('pending');
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  const [scraping, setScraping] = useState(false);
  const [scrapeSummary, setScrapeSummary] = useState<
    | null
    | {
        ran_at: string;
        summary: { source: string; found: number; sent: number; error?: string }[];
      }
  >(null);

  const [settings, setSettings] = useState<ScrapeSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState(defaultSettingsDraft);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceDraft, setSourceDraft] = useState<ScrapeSourceDraft>(defaultSourceDraft);

  const canManage = isOfficial();
  const canControlScraper = hasRole('admin');

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    fetchJobs();
  }, [canManage, view]);

  useEffect(() => {
    if (!canControlScraper) return;
    fetchScrapeControls();
  }, [canControlScraper]);

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

  const fetchScrapeControls = async () => {
    setSourcesLoading(true);

    const settingsQuery = (supabase.from('job_scrape_settings' as never) as any)
      .select('id,max_per_source,request_delay_ms,job_max_priority,updated_at')
      .eq('id', 1)
      .maybeSingle();

    const sourcesQuery = (supabase.from('job_scrape_sources' as never) as any)
      .select('id,name,url,category,priority,is_active,created_at')
      .order('priority', { ascending: true })
      .order('name', { ascending: true });

    const [{ data: settingsData, error: settingsError }, { data: sourcesData, error: sourcesError }] =
      await Promise.all([settingsQuery, sourcesQuery]);

    if (settingsError) {
      showError('Failed to load scrape settings.', 3000);
    } else {
      const nextSettings =
        (settingsData as ScrapeSettings | null) ||
        ({
          id: 1,
          max_per_source: 20,
          request_delay_ms: 1200,
          job_max_priority: 2,
          updated_at: null,
        } as ScrapeSettings);

      setSettings(nextSettings);
      setSettingsDraft({
        max_per_source: String(nextSettings.max_per_source),
        request_delay_ms: String(nextSettings.request_delay_ms),
        job_max_priority: String(nextSettings.job_max_priority),
      });
    }

    if (sourcesError) {
      showError('Failed to load scrape sources.', 3000);
    } else {
      setSources((sourcesData || []) as ScrapeSource[]);
    }

    setSourcesLoading(false);
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

  const saveScrapeSettings = async () => {
    const maxPerSource = Number(settingsDraft.max_per_source);
    const requestDelay = Number(settingsDraft.request_delay_ms);
    const maxPriority = Number(settingsDraft.job_max_priority);

    if (!Number.isInteger(maxPerSource) || maxPerSource < 1 || maxPerSource > 100) {
      showError('Max per source must be 1 to 100.', 3000);
      return;
    }
    if (!Number.isInteger(requestDelay) || requestDelay < 0 || requestDelay > 10000) {
      showError('Request delay must be 0 to 10000 ms.', 3000);
      return;
    }
    if (!Number.isInteger(maxPriority) || maxPriority < 1 || maxPriority > 10) {
      showError('Max priority must be 1 to 10.', 3000);
      return;
    }

    setSettingsSaving(true);

    const { data, error } = await (supabase.from('job_scrape_settings' as never) as any)
      .upsert(
        {
          id: 1,
          max_per_source: maxPerSource,
          request_delay_ms: requestDelay,
          job_max_priority: maxPriority,
          updated_by: user?.id ?? null,
        },
        { onConflict: 'id' }
      )
      .select('id,max_per_source,request_delay_ms,job_max_priority,updated_at')
      .single();

    if (error) {
      showError('Failed to save scrape settings.', 3000);
      setSettingsSaving(false);
      return;
    }

    setSettings(data as ScrapeSettings);
    setSettingsDraft({
      max_per_source: String((data as ScrapeSettings).max_per_source),
      request_delay_ms: String((data as ScrapeSettings).request_delay_ms),
      job_max_priority: String((data as ScrapeSettings).job_max_priority),
    });
    showSuccess('Scrape settings saved.', 2500);
    setSettingsSaving(false);
  };

  const addSource = async () => {
    const name = sourceDraft.name.trim();
    const url = sourceDraft.url.trim();
    const category = sourceDraft.category.trim() || 'other';
    const priority = Number(sourceDraft.priority);

    if (!name || !url) {
      showError('Source name and URL are required.', 3000);
      return;
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      showError('Enter a valid source URL.', 3000);
      return;
    }

    if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
      showError('Priority must be between 1 and 10.', 3000);
      return;
    }

    setSourceSaving(true);
    const { error } = await (supabase.from('job_scrape_sources' as never) as any).insert({
      name,
      url,
      category,
      priority,
      is_active: true,
      created_by: user?.id ?? null,
    });

    if (error) {
      showError(error.message || 'Failed to add source.', 3000);
      setSourceSaving(false);
      return;
    }

    showSuccess('Source added.', 2500);
    setSourceDraft(defaultSourceDraft);
    await fetchScrapeControls();
    setSourceSaving(false);
  };

  const toggleSourceActive = async (source: ScrapeSource) => {
    const { error } = await (supabase.from('job_scrape_sources' as never) as any)
      .update({ is_active: !source.is_active })
      .eq('id', source.id);

    if (error) {
      showError('Failed to update source status.', 3000);
      return;
    }

    setSources((prev) => prev.map((row) => (row.id === source.id ? { ...row, is_active: !row.is_active } : row)));
  };

  const deleteSource = async (source: ScrapeSource) => {
    const confirmed = window.confirm(`Delete source "${source.name}"?`);
    if (!confirmed) return;

    const { error } = await (supabase.from('job_scrape_sources' as never) as any)
      .delete()
      .eq('id', source.id);

    if (error) {
      showError('Failed to delete source.', 3000);
      return;
    }

    setSources((prev) => prev.filter((row) => row.id !== source.id));
    showSuccess('Source removed.', 2500);
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

  const triggerScrape = async () => {
    if (!canControlScraper) {
      showError('Only admins can run scraping manually.', 3000);
      return;
    }

    setScraping(true);
    setScrapeSummary(null);

    const { data, error } = await supabase.functions.invoke('jobs-scrape', {
      body: { reason: 'admin-dashboard' },
    });

    if (error) {
      showError('Failed to trigger scraping.', 3000);
      setScraping(false);
      return;
    }

    showSuccess('Scraping finished.', 2500);
    setScrapeSummary({
      ran_at: (data as any)?.ran_at,
      summary: (data as any)?.summary ?? [],
    });

    fetchJobs();
    setScraping(false);
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
            Review incoming job listings and manage scraping controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canControlScraper && (
            <Button size="sm" variant="secondary" onClick={triggerScrape} disabled={scraping}>
              {scraping ? 'Running scrape...' : 'Run scraping now'}
            </Button>
          )}
          <Badge variant="secondary">Pending: {summary.pending}</Badge>
          <Badge variant="secondary">Rejected: {summary.rejected}</Badge>
          <Badge variant="secondary">Loaded: {summary.total}</Badge>
        </div>
      </div>

      {canControlScraper ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scraping Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Max Jobs Per Source</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settingsDraft.max_per_source}
                    onChange={(event) => setSettingsDraft((prev) => ({ ...prev, max_per_source: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Request Delay (ms)</label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    value={settingsDraft.request_delay_ms}
                    onChange={(event) => setSettingsDraft((prev) => ({ ...prev, request_delay_ms: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Max Source Priority</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settingsDraft.job_max_priority}
                    onChange={(event) => setSettingsDraft((prev) => ({ ...prev, job_max_priority: event.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={saveScrapeSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving...' : 'Save scrape settings'}
                </Button>
                {settings?.updated_at && (
                  <span className="text-xs text-muted-foreground">
                    Last updated: {new Date(settings.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder="Source name"
                  value={sourceDraft.name}
                  onChange={(event) => setSourceDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
                <Input
                  placeholder="https://example.com/jobs"
                  value={sourceDraft.url}
                  onChange={(event) => setSourceDraft((prev) => ({ ...prev, url: event.target.value }))}
                />
                <Input
                  placeholder="Category"
                  value={sourceDraft.category}
                  onChange={(event) => setSourceDraft((prev) => ({ ...prev, category: event.target.value }))}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="Priority"
                    value={sourceDraft.priority}
                    onChange={(event) => setSourceDraft((prev) => ({ ...prev, priority: event.target.value }))}
                  />
                  <Button size="sm" onClick={addSource} disabled={sourceSaving}>
                    {sourceSaving ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>

              {sourcesLoading && <div className="text-sm text-muted-foreground">Loading sources...</div>}

              {!sourcesLoading && sources.length === 0 && (
                <div className="text-sm text-muted-foreground">No sources yet. Add one above.</div>
              )}

              {!sourcesLoading && sources.length > 0 && (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{source.name}</div>
                        <div className="text-xs text-muted-foreground break-all">{source.url}</div>
                        <div className="text-xs text-muted-foreground">
                          category: {source.category} | priority: {source.priority} | {source.is_active ? 'active' : 'inactive'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleSourceActive(source)}>
                          {source.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteSource(source)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Only admin users can change scrape settings or manage job sources.
          </CardContent>
        </Card>
      )}

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
          <CardContent className="py-6 text-sm text-muted-foreground">No jobs to review right now.</CardContent>
        </Card>
      )}

      {scrapeSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last scrape - {new Date(scrapeSummary.ran_at).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {scrapeSummary.summary.length === 0 && (
              <div className="text-muted-foreground">No sources processed.</div>
            )}
            {scrapeSummary.summary.map((row) => (
              <div key={row.source} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{row.source}</span>
                <span className="text-muted-foreground">
                  found {row.found} - sent {row.sent}
                  {row.error ? ` - error: ${row.error}` : ''}
                </span>
              </div>
            ))}
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
                {job.organization} - {job.location} - {job.county}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Source:{' '}
                <a className="text-primary underline" href={job.source_url} target="_blank" rel="noreferrer">
                  {job.source_name}
                </a>
              </div>

              {job.excerpt && <p className="text-sm text-muted-foreground">{job.excerpt}</p>}

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
                <Button size="sm" className="gap-2" onClick={() => handleApprove(job)}>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => handleReject(job)}>
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
