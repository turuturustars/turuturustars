import { supabase } from '@/integrations/supabase/client';

export type BackgroundJobType =
  | 'notification_single'
  | 'notification_bulk'
  | 'announcement_notifications'
  | 'meeting_notifications'
  | 'sms_bulk'
  | 'whatsapp_bulk'
  | 'email_bulk'
  | 'reminder_batch'
  | 'bulk_import'
  | 'admin_report_export'
  | 'report_export'
  | 'audit_log_export'
  | 'announcement_export'
  | 'member_export'
  | 'welfare_export'
  | 'accounting_export'
  | 'payments_export'
  | 'payment_reconciliation'
  | 'mpesa_status_recheck'
  | 'mpesa_url_registration';

export interface EnqueueBackgroundJobOptions {
  jobType: BackgroundJobType;
  payload?: Record<string, unknown>;
  priority?: number;
  runAfter?: string | null;
  dedupeKey?: string | null;
  maxAttempts?: number;
}

export async function enqueueBackgroundJob(options: EnqueueBackgroundJobOptions): Promise<string> {
  const { data, error } = await supabase.rpc('enqueue_background_job' as never, {
    p_job_type: options.jobType,
    p_payload: options.payload ?? {},
    p_priority: options.priority ?? 5,
    p_run_after: options.runAfter ?? new Date().toISOString(),
    p_dedupe_key: options.dedupeKey ?? null,
    p_max_attempts: options.maxAttempts ?? 5,
  } as never);

  if (error) {
    throw new Error(error.message || 'Failed to queue background job');
  }

  const jobId = typeof data === 'string' ? data : String(data ?? '');
  if (!jobId) {
    throw new Error('Background job was queued without an id');
  }

  return jobId;
}

export function shortJobId(jobId: string): string {
  return jobId.slice(0, 8);
}
