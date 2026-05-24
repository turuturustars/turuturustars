import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  MessageCircle,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { enqueueBackgroundJob, shortJobId } from '@/lib/backgroundJobs';
import { cn } from '@/lib/utils';

type BotScope = 'public' | 'member' | 'both';
type KnowledgeEntry = Tables<'ai_knowledge_base'>;
type WhatsAppMessage = Tables<'whatsapp_messages'> & {
  whatsapp_contacts?: {
    profile_name: string | null;
    phone_number: string;
    wa_id: string;
  } | null;
};
type PaymentIntent = Tables<'whatsapp_payment_intents'> & {
  profiles?: {
    full_name: string | null;
    membership_number: string | null;
  } | null;
};
type WhatsAppNotification = Pick<
  Tables<'notifications'>,
  'id' | 'title' | 'message' | 'type' | 'created_at' | 'whatsapp_status' | 'whatsapp_error' | 'whatsapp_sent_at'
>;
type WhatsAppQueueRow = {
  id: string;
  user_id: string;
  event_type: string;
  event_id: string | null;
  phone: string;
  message: string;
  priority: string;
  status: string;
  attempts: number;
  provider_message_id: string | null;
  whatsapp_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  next_attempt_at: string | null;
  last_attempt_at: string | null;
  dead_lettered_at: string | null;
  template_name: string | null;
  template_language: string | null;
};
type QueueProfile = {
  id: string;
  full_name: string | null;
  membership_number: string | null;
  phone: string | null;
};
type CommunitySubmission = Tables<'community_knowledge_submissions'> & {
  profiles?: {
    full_name: string | null;
    membership_number: string | null;
  } | null;
};

interface KnowledgeForm {
  id: string | null;
  title: string;
  category: string;
  bot_scope: BotScope;
  content: string;
  is_active: boolean;
}

const emptyForm: KnowledgeForm = {
  id: null,
  title: '',
  category: 'general',
  bot_scope: 'both',
  content: '',
  is_active: true,
};

const scopeLabels: Record<BotScope, string> = {
  public: 'Public',
  member: 'Member',
  both: 'Both',
};

const WhatsAppAutomationPage = () => {
  const { user, isLoading: authLoading, isOfficial } = useAuth();
  const { toast } = useToast();
  const canManage = isOfficial();
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [payments, setPayments] = useState<PaymentIntent[]>([]);
  const [notifications, setNotifications] = useState<WhatsAppNotification[]>([]);
  const [queueRows, setQueueRows] = useState<WhatsAppQueueRow[]>([]);
  const [queueProfiles, setQueueProfiles] = useState<Record<string, QueueProfile>>({});
  const [submissions, setSubmissions] = useState<CommunitySubmission[]>([]);
  const [form, setForm] = useState<KnowledgeForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from Turuturu Stars WhatsApp assistant.');
  const [simulatePhone, setSimulatePhone] = useState('');
  const [simulateText, setSimulateText] = useState('MY ROLE');

  const stats = useMemo(() => {
    const activeKnowledge = knowledge.filter((entry) => entry.is_active).length;
    const pendingSubmissions = submissions.filter((submission) => submission.status === 'pending').length;
    const inboundMessages = messages.filter((message) => message.direction === 'inbound').length;
    const pendingPayments = payments.filter((payment) => ['pending', 'stk_requested'].includes(payment.status)).length;
    const failedPayments = payments.filter((payment) => payment.status === 'failed').length;
    const queuedNotifications = queueRows.filter((row) => ['pending', 'processing'].includes(row.status)).length;
    const sentAlerts = queueRows.filter((row) => row.status === 'sent').length;
    const failedAlerts = queueRows.filter((row) => row.status === 'failed' || row.status === 'skipped' || row.dead_lettered_at).length;

    return { activeKnowledge, pendingSubmissions, inboundMessages, pendingPayments, failedPayments, queuedNotifications, sentAlerts, failedAlerts };
  }, [knowledge, messages, payments, queueRows, submissions]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    const [knowledgeResult, submissionResult, messageResult, paymentResult, notificationResult, queueResult] = await Promise.all([
      supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('updated_at', { ascending: false }),
      supabase
        .from('community_knowledge_submissions')
        .select('*, profiles(full_name, membership_number)')
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('whatsapp_messages')
        .select('id, contact_id, member_id, profile_id, phone, wa_message_id, provider_message_id, direction, message_type, text_body, body, status, status_updated_at, created_at, payload, raw_payload, whatsapp_contacts(profile_name, phone_number, wa_id)')
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('whatsapp_payment_intents')
        .select('id, contact_id, member_id, phone_number, amount, payment_purpose, contribution_ids, wallet_transaction_id, checkout_request_id, merchant_request_id, mpesa_transaction_id, status, failure_reason, created_at, updated_at, profiles(full_name, membership_number)')
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('notifications')
        .select('id, title, message, type, created_at, whatsapp_status, whatsapp_error, whatsapp_sent_at')
        .not('whatsapp_status', 'is', null)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('whatsapp_notifications_queue' as never)
        .select('id, user_id, event_type, event_id, phone, message, priority, status, attempts, provider_message_id, whatsapp_message_id, last_error, created_at, updated_at, processed_at, next_attempt_at, last_attempt_at, dead_lettered_at, template_name, template_language')
        .order('created_at', { ascending: false })
        .limit(80),
    ]);

    if (knowledgeResult.error || submissionResult.error || messageResult.error || paymentResult.error || notificationResult.error || queueResult.error) {
      toast({
        title: 'WhatsApp data not loaded',
        description: knowledgeResult.error?.message || submissionResult.error?.message || messageResult.error?.message || paymentResult.error?.message || notificationResult.error?.message || queueResult.error?.message,
        variant: 'destructive',
      });
    }

    const queued = (queueResult.data ?? []) as unknown as WhatsAppQueueRow[];
    const profileIds = Array.from(new Set(queued.map((row) => row.user_id).filter(Boolean)));
    let profilesById: Record<string, QueueProfile> = {};
    if (profileIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, membership_number, phone')
        .in('id', profileIds);

      if (profileError) {
        toast({
          title: 'Queue members not loaded',
          description: profileError.message,
          variant: 'destructive',
        });
      } else {
        profilesById = Object.fromEntries(((profileRows ?? []) as QueueProfile[]).map((profile) => [profile.id, profile]));
      }
    }

    setKnowledge((knowledgeResult.data ?? []) as KnowledgeEntry[]);
    setSubmissions((submissionResult.data ?? []) as CommunitySubmission[]);
    setMessages((messageResult.data ?? []) as WhatsAppMessage[]);
    setPayments((paymentResult.data ?? []) as PaymentIntent[]);
    setNotifications((notificationResult.data ?? []) as WhatsAppNotification[]);
    setQueueRows(queued);
    setQueueProfiles(profilesById);
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && canManage) {
      fetchDashboardData();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, canManage, fetchDashboardData]);

  const handleEdit = (entry: KnowledgeEntry) => {
    setForm({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      bot_scope: normalizeScope(entry.bot_scope),
      content: entry.content,
      is_active: entry.is_active,
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({
        title: 'Missing answer',
        description: 'Add a title and WhatsApp answer before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || 'general',
      bot_scope: form.bot_scope,
      content: form.content.trim(),
      is_active: form.is_active,
      metadata: {},
    };

    const result = form.id
      ? await supabase.from('ai_knowledge_base').update(payload).eq('id', form.id)
      : await supabase.from('ai_knowledge_base').insert({ ...payload, created_by: user?.id ?? null });

    setIsSaving(false);

    if (result.error) {
      toast({
        title: 'Answer not saved',
        description: result.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Answer saved',
      description: `${scopeLabels[form.bot_scope]} bot knowledge is updated.`,
    });
    setForm(emptyForm);
    fetchDashboardData();
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast({
        title: 'Missing test message',
        description: 'Add a WhatsApp number and message.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-send', {
      body: {
        to: testPhone.trim(),
        text: testMessage.trim(),
        sourceType: 'dashboard_test',
      },
    });
    setIsSending(false);

    const response = data as { ok?: boolean; error?: string } | null;
    if (error || response?.ok === false) {
      toast({
        title: 'Test message failed',
        description: error?.message || response?.error || 'WhatsApp sender returned an error.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Test message sent',
      description: 'The outbound WhatsApp message was queued through the official sender.',
    });
    fetchDashboardData();
  };

  const handleRunNotificationWorker = async (retryFailed = false) => {
    setIsDispatching(true);
    try {
      const jobId = await enqueueBackgroundJob({
        jobType: 'whatsapp_bulk',
        payload: {
          limit: 100,
          includeAbandonment: false,
          retryFailed,
        },
        priority: retryFailed ? 4 : 5,
        dedupeKey: `whatsapp_bulk:${retryFailed ? 'retry' : 'pending'}`,
      });

      toast({
        title: retryFailed ? 'Failed alerts requeue queued' : 'WhatsApp queue dispatch queued',
        description: `Background job ${shortJobId(jobId)} will process the WhatsApp queue.`,
      });
      fetchDashboardData();
    } catch (error) {
      toast({
        title: 'Notification dispatch failed',
        description: error instanceof Error ? error.message : 'Could not queue WhatsApp notification worker.',
        variant: 'destructive',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSimulateInbound = async () => {
    if (!simulatePhone.trim() || !simulateText.trim()) {
      toast({
        title: 'Missing simulation',
        description: 'Add a WhatsApp number and inbound message.',
        variant: 'destructive',
      });
      return;
    }

    setIsSimulating(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
      body: {
        simulate: true,
        from: simulatePhone.trim(),
        text: simulateText.trim(),
      },
    });
    setIsSimulating(false);

    const response = data as { ok?: boolean; error?: string } | null;
    if (error || response?.ok === false) {
      toast({
        title: 'Simulation failed',
        description: error?.message || response?.error || 'WhatsApp webhook simulation returned an error.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Inbound message simulated',
      description: 'The webhook handled the message using the live assistant path.',
    });
    fetchDashboardData();
  };

  const handleApproveSubmission = async (submission: CommunitySubmission) => {
    setProcessingSubmissionId(submission.id);
    const { data: knowledgeEntry, error: insertError } = await supabase
      .from('ai_knowledge_base')
      .insert({
        category: submission.topic || 'community',
        bot_scope: 'both',
        title: communitySubmissionTitle(submission),
        content: buildCommunityKnowledgeContent(submission),
        is_active: true,
        created_by: user?.id ?? null,
        metadata: {
          source: 'community_knowledge_submission',
          submission_id: submission.id,
          area: submission.area,
          attribution_name: submission.attribution_name,
          phone: submission.phone,
          reviewed_by: user?.id ?? null,
        },
      })
      .select('id')
      .single();

    if (insertError || !knowledgeEntry) {
      setProcessingSubmissionId(null);
      toast({
        title: 'Submission not approved',
        description: insertError?.message || 'The bot answer could not be created.',
        variant: 'destructive',
      });
      return;
    }

    const { error: updateError } = await supabase
      .from('community_knowledge_submissions')
      .update({
        status: 'approved',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        ai_knowledge_base_id: knowledgeEntry.id,
      })
      .eq('id', submission.id);

    setProcessingSubmissionId(null);

    if (updateError) {
      toast({
        title: 'Review status not updated',
        description: updateError.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Community memory approved',
      description: 'The reviewed submission is now active bot knowledge.',
    });
    fetchDashboardData();
  };

  const handleRejectSubmission = async (submission: CommunitySubmission) => {
    setProcessingSubmissionId(submission.id);
    const { error } = await supabase
      .from('community_knowledge_submissions')
      .update({
        status: 'rejected',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission.id);
    setProcessingSubmissionId(null);

    if (error) {
      toast({
        title: 'Submission not rejected',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Community memory rejected',
      description: 'The submission will stay out of active bot knowledge.',
    });
    fetchDashboardData();
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Automation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This workspace is available to Turuturu Stars officials.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">WhatsApp Automation</h1>
          <p className="text-sm text-muted-foreground">Public assistant, member assistant, payments, and bot knowledge.</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" className="w-full gap-2 sm:w-auto">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
        <StatCard icon={Bot} label="Active answers" value={stats.activeKnowledge} />
        <StatCard icon={MessageCircle} label="Pending memories" value={stats.pendingSubmissions} tone={stats.pendingSubmissions > 0 ? 'attention' : 'normal'} />
        <StatCard icon={MessageCircle} label="Recent inbound" value={stats.inboundMessages} />
        <StatCard icon={Smartphone} label="Payment requests" value={stats.pendingPayments} />
        <StatCard icon={Clock} label="Queued alerts" value={stats.queuedNotifications} tone={stats.queuedNotifications > 0 ? 'attention' : 'normal'} />
        <StatCard icon={Send} label="Sent alerts" value={stats.sentAlerts} />
        <StatCard icon={AlertTriangle} label="Failed alerts" value={stats.failedAlerts} tone={stats.failedAlerts > 0 ? 'danger' : 'normal'} />
        <StatCard icon={XCircle} label="Failed payments" value={stats.failedPayments} tone={stats.failedPayments > 0 ? 'danger' : 'normal'} />
      </div>

      <Tabs defaultValue="knowledge" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-grid sm:w-auto sm:grid-cols-8">
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="notifications">Notices</TabsTrigger>
          <TabsTrigger value="send">Test Send</TabsTrigger>
          <TabsTrigger value="simulate">Simulate</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">{form.id ? 'Edit Bot Answer' : 'New Bot Answer'}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setForm(emptyForm)} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_160px]">
                <div className="space-y-2">
                  <Label htmlFor="knowledge-title">Title</Label>
                  <Input
                    id="knowledge-title"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="e.g. Membership registration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="knowledge-category">Category</Label>
                  <Input
                    id="knowledge-category"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="membership"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bot</Label>
                  <Select value={form.bot_scope} onValueChange={(value) => setForm((current) => ({ ...current, bot_scope: normalizeScope(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="knowledge-content">WhatsApp answer</Label>
                <Textarea
                  id="knowledge-content"
                  rows={5}
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder="Write the answer the chatbot can use."
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
                  Active
                </label>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Answer'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 xl:grid-cols-2">
            {knowledge.map((entry) => (
              <Card key={entry.id} className={cn(!entry.is_active && 'opacity-70')}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{entry.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.category}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ScopeBadge scope={normalizeScope(entry.bot_scope)} />
                      <StatusBadge active={entry.is_active} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{entry.content}</p>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>Updated {formatDate(entry.updated_at)}</span>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Community Knowledge Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Submission</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="min-w-36">
                        <div className="font-medium">{titleCase(submission.topic || 'community')}</div>
                        <div className="text-xs text-muted-foreground">{submission.area || 'General'}</div>
                      </TableCell>
                      <TableCell className="max-w-lg">
                        <p className="line-clamp-3 text-sm">{submission.answer}</p>
                        {submission.question && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{submission.question}</p>
                        )}
                      </TableCell>
                      <TableCell className="min-w-40">
                        <div className="text-sm">{submission.attribution_name || submission.profiles?.full_name || 'WhatsApp'}</div>
                        <div className="text-xs text-muted-foreground">{submission.profiles?.membership_number || submission.phone || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <ReviewStatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(submission.created_at)}</TableCell>
                      <TableCell>
                        {submission.status === 'pending' ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              size="sm"
                              className="gap-2"
                              disabled={processingSubmissionId === submission.id}
                              onClick={() => handleApproveSubmission(submission)}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={processingSubmissionId === submission.id}
                              onClick={() => handleRejectSubmission(submission)}
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Reviewed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent WhatsApp Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="min-w-40">
                        <div className="font-medium">{message.whatsapp_contacts?.profile_name || message.whatsapp_contacts?.phone_number || message.phone || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{message.whatsapp_contacts?.wa_id || message.member_id || message.profile_id || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={message.direction === 'inbound' ? 'secondary' : 'outline'}>{message.direction}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2 text-sm">{message.text_body || message.body || message.message_type}</p>
                      </TableCell>
                      <TableCell>{message.status}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(message.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">WhatsApp Payment Intents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment reference</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="min-w-44">
                        <div className="font-medium">{payment.profiles?.full_name || 'Member'}</div>
                        <div className="text-xs text-muted-foreground">{payment.profiles?.membership_number || payment.member_id}</div>
                      </TableCell>
                      <TableCell>{payment.phone_number}</TableCell>
                      <TableCell>{payment.payment_purpose.replace('_', ' ')}</TableCell>
                      <TableCell>KES {Number(payment.amount).toLocaleString('en-KE')}</TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="max-w-52 truncate text-xs text-muted-foreground">{payment.checkout_request_id || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(payment.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">WhatsApp Alert Queue</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => handleRunNotificationWorker(false)} disabled={isDispatching} className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  {isDispatching ? 'Running...' : 'Run Worker'}
                </Button>
                <Button onClick={() => handleRunNotificationWorker(true)} disabled={isDispatching} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retry Failed
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueRows.map((row) => {
                    const profile = queueProfiles[row.user_id];
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="min-w-44">
                          <div className="font-medium">{profile?.full_name || row.phone || 'Member'}</div>
                          <div className="text-xs text-muted-foreground">{profile?.membership_number || profile?.phone || row.user_id}</div>
                        </TableCell>
                        <TableCell className="min-w-36">
                          <div className="font-medium">{titleCase(row.event_type)}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge variant="outline">{row.priority}</Badge>
                            {row.template_name && <Badge variant="secondary">{row.template_name}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2 text-sm">{row.message}</p>
                        </TableCell>
                        <TableCell>
                          <DeliveryStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>{row.attempts}</TableCell>
                        <TableCell className="min-w-44 text-xs text-muted-foreground">
                          <div>Created {formatDate(row.created_at)}</div>
                          {row.next_attempt_at && <div>Next {formatDate(row.next_attempt_at)}</div>}
                          {row.dead_lettered_at && <div className="text-destructive">Dead-letter {formatDate(row.dead_lettered_at)}</div>}
                          {row.processed_at && <div>Processed {formatDate(row.processed_at)}</div>}
                        </TableCell>
                        <TableCell className="max-w-64 truncate text-xs text-muted-foreground">{row.last_error || row.provider_message_id || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">WhatsApp Notifications</CardTitle>
              <Button onClick={() => handleRunNotificationWorker(false)} disabled={isDispatching} className="gap-2">
                <Send className="h-4 w-4" />
                {isDispatching ? 'Sending...' : 'Send Queued'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="max-w-md">
                        <div className="font-medium">{notification.title}</div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
                      </TableCell>
                      <TableCell>{notification.type}</TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={notification.whatsapp_status || 'pending'} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(notification.whatsapp_sent_at)}</TableCell>
                      <TableCell className="max-w-64 truncate text-xs text-muted-foreground">{notification.whatsapp_error || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Send Test Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-phone">WhatsApp number</Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value)}
                  placeholder="2547..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-message">Message</Label>
                <Textarea
                  id="test-message"
                  rows={4}
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                />
              </div>
              <Button onClick={handleSendTest} disabled={isSending} className="gap-2">
                <Send className="h-4 w-4" />
                {isSending ? 'Sending...' : 'Send WhatsApp'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulate">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Simulate Inbound Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="simulate-phone">Member WhatsApp number</Label>
                <Input
                  id="simulate-phone"
                  value={simulatePhone}
                  onChange={(event) => setSimulatePhone(event.target.value)}
                  placeholder="2547..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="simulate-text">Inbound message</Label>
                <Textarea
                  id="simulate-text"
                  rows={4}
                  value={simulateText}
                  onChange={(event) => setSimulateText(event.target.value)}
                />
              </div>
              <Button onClick={handleSimulateInbound} disabled={isSimulating} className="gap-2">
                <PlayCircle className="h-4 w-4" />
                {isSimulating ? 'Simulating...' : 'Simulate Message'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone = 'normal',
}: {
  icon: typeof Bot;
  label: string;
  value: number;
  tone?: 'normal' | 'danger' | 'attention';
}) => (
  <Card>
    <CardContent className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn('mt-1 text-2xl font-semibold', tone === 'danger' && 'text-destructive', tone === 'attention' && 'text-amber-600')}>{value}</p>
      </div>
      <div className={cn(
        'rounded-md bg-primary/10 p-2 text-primary',
        tone === 'danger' && 'bg-destructive/10 text-destructive',
        tone === 'attention' && 'bg-amber-100 text-amber-700',
      )}>
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

const ScopeBadge = ({ scope }: { scope: BotScope }) => (
  <Badge variant={scope === 'public' ? 'outline' : scope === 'member' ? 'secondary' : 'default'}>
    {scopeLabels[scope]}
  </Badge>
);

const StatusBadge = ({ active }: { active: boolean }) => (
  <Badge variant={active ? 'secondary' : 'outline'} className="gap-1">
    {active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {active ? 'Active' : 'Off'}
  </Badge>
);

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const variant = status === 'completed' ? 'secondary' : status === 'failed' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
};

const DeliveryStatusBadge = ({ status }: { status: string }) => {
  const variant = status === 'sent' ? 'secondary' : ['failed', 'skipped'].includes(status) ? 'destructive' : 'outline';
  return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
};

const ReviewStatusBadge = ({ status }: { status: string }) => {
  const variant = status === 'approved' ? 'secondary' : status === 'rejected' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
};

function normalizeScope(value: string): BotScope {
  return value === 'public' || value === 'member' || value === 'both' ? value : 'both';
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy HH:mm');
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function communitySubmissionTitle(submission: CommunitySubmission) {
  const topic = titleCase(submission.topic || 'community');
  return submission.area ? `${topic}: ${submission.area}` : `Community Memory: ${topic}`;
}

function buildCommunityKnowledgeContent(submission: CommunitySubmission) {
  const parts = [
    submission.area ? `Area: ${submission.area}.` : null,
    submission.answer.trim(),
    submission.attribution_name ? `Community source: ${submission.attribution_name}.` : null,
    'This is community-submitted knowledge reviewed by Turuturu Stars officials.',
  ].filter((part): part is string => Boolean(part));

  return parts.join(' ');
}

export default WhatsAppAutomationPage;
