import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Bot,
  CheckCircle,
  MessageCircle,
  PlusCircle,
  RefreshCw,
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
  const [form, setForm] = useState<KnowledgeForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from Turuturu Stars WhatsApp assistant.');

  const stats = useMemo(() => {
    const activeKnowledge = knowledge.filter((entry) => entry.is_active).length;
    const inboundMessages = messages.filter((message) => message.direction === 'inbound').length;
    const pendingPayments = payments.filter((payment) => ['pending', 'stk_requested'].includes(payment.status)).length;
    const failedPayments = payments.filter((payment) => payment.status === 'failed').length;
    const queuedNotifications = notifications.filter((notification) => notification.whatsapp_status === 'queued').length;

    return { activeKnowledge, inboundMessages, pendingPayments, failedPayments, queuedNotifications };
  }, [knowledge, messages, payments, notifications]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    const [knowledgeResult, messageResult, paymentResult, notificationResult] = await Promise.all([
      supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('updated_at', { ascending: false }),
      supabase
        .from('whatsapp_messages')
        .select('id, contact_id, member_id, wa_message_id, direction, message_type, text_body, status, status_updated_at, created_at, payload, whatsapp_contacts(profile_name, phone_number, wa_id)')
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
    ]);

    if (knowledgeResult.error || messageResult.error || paymentResult.error || notificationResult.error) {
      toast({
        title: 'WhatsApp data not loaded',
        description: knowledgeResult.error?.message || messageResult.error?.message || paymentResult.error?.message || notificationResult.error?.message,
        variant: 'destructive',
      });
    }

    setKnowledge((knowledgeResult.data ?? []) as KnowledgeEntry[]);
    setMessages((messageResult.data ?? []) as WhatsAppMessage[]);
    setPayments((paymentResult.data ?? []) as PaymentIntent[]);
    setNotifications((notificationResult.data ?? []) as WhatsAppNotification[]);
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

  const handleDispatchQueuedNotifications = async () => {
    setIsDispatching(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-notifications', {
      body: { limit: 25 },
    });
    setIsDispatching(false);

    const response = data as { ok?: boolean; error?: string; count?: number } | null;
    if (error || response?.ok === false) {
      toast({
        title: 'Notification dispatch failed',
        description: error?.message || response?.error || 'WhatsApp notification dispatcher returned an error.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Queued notifications processed',
      description: `${response?.count ?? 0} WhatsApp notifications were processed.`,
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Bot} label="Active answers" value={stats.activeKnowledge} />
        <StatCard icon={MessageCircle} label="Recent inbound" value={stats.inboundMessages} />
        <StatCard icon={Smartphone} label="Payment prompts" value={stats.pendingPayments} />
        <StatCard icon={Send} label="Queued notices" value={stats.queuedNotifications} />
        <StatCard icon={XCircle} label="Failed payments" value={stats.failedPayments} tone={stats.failedPayments > 0 ? 'danger' : 'normal'} />
      </div>

      <Tabs defaultValue="knowledge" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-grid sm:w-auto sm:grid-cols-5">
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notifications">Notices</TabsTrigger>
          <TabsTrigger value="send">Test Send</TabsTrigger>
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
                        <div className="font-medium">{message.whatsapp_contacts?.profile_name || message.whatsapp_contacts?.phone_number || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{message.whatsapp_contacts?.wa_id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={message.direction === 'inbound' ? 'secondary' : 'outline'}>{message.direction}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2 text-sm">{message.text_body || message.message_type}</p>
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
                    <TableHead>Checkout</TableHead>
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

        <TabsContent value="notifications">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">WhatsApp Notifications</CardTitle>
              <Button onClick={handleDispatchQueuedNotifications} disabled={isDispatching} className="gap-2">
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
  tone?: 'normal' | 'danger';
}) => (
  <Card>
    <CardContent className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn('mt-1 text-2xl font-semibold', tone === 'danger' && 'text-destructive')}>{value}</p>
      </div>
      <div className={cn('rounded-md bg-primary/10 p-2 text-primary', tone === 'danger' && 'bg-destructive/10 text-destructive')}>
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

function normalizeScope(value: string): BotScope {
  return value === 'public' || value === 'member' || value === 'both' ? value : 'both';
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy HH:mm');
}

export default WhatsAppAutomationPage;
