import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";

type BackgroundJobRow = {
  id: string;
  job_type: string;
  payload: Record<string, unknown> | null;
  attempts: number;
};

type WorkerRequest = {
  limit?: number;
  dry_run?: boolean;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const WORKER_NAME = "background-job-worker";

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new HttpError(500, "Missing Supabase service credentials");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });
}

function ensureAuthorized(req: Request): void {
  const expectedSecret = Deno.env.get("BACKGROUND_JOBS_WORKER_SECRET")?.trim();
  if (!expectedSecret) {
    return;
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const customHeader = req.headers.get("x-background-job-secret")?.trim() || "";

  if (bearer !== expectedSecret && customHeader !== expectedSecret) {
    throw new HttpError(401, "Unauthorized");
  }
}

function parseBody(body: WorkerRequest | null | undefined) {
  const rawLimit = body?.limit;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(MAX_LIMIT, Number(rawLimit))) : DEFAULT_LIMIT;
  return {
    limit,
    dryRun: body?.dry_run === true,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

async function invokeFunction(
  name: string,
  body: Record<string, unknown>,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new HttpError(500, "Missing Supabase service credentials");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": serviceRole,
    "authorization": `Bearer ${serviceRole}`,
  };

  if (name === "sms-reminders") {
    const secret = Deno.env.get("SMS_REMINDERS_JOB_SECRET")?.trim();
    if (secret) headers["x-sms-job-secret"] = secret;
  }

  if (name === "whatsapp-notification-worker") {
    const secret = (
      Deno.env.get("WHATSAPP_NOTIFICATIONS_JOB_SECRET") ||
      Deno.env.get("WHATSAPP_NOTIFICATION_SECRET") ||
      ""
    ).trim();
    if (secret) headers["x-whatsapp-job-secret"] = secret;
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data
      ? String((data as { error?: unknown }).error)
      : `Failed to invoke ${name}`;
    throw new Error(message);
  }
  return data ?? {};
}

async function insertNotifications(
  supabase: ReturnType<typeof createServiceClient>,
  rows: Array<Record<string, unknown>>,
) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    const { error } = await supabase.from("notifications").insert(chunk);
    if (error) {
      throw new Error(error.message || "Failed to insert queued notifications");
    }
    inserted += chunk.length;
  }
  return inserted;
}

async function processJob(
  supabase: ReturnType<typeof createServiceClient>,
  job: BackgroundJobRow,
): Promise<Record<string, unknown>> {
  const payload = asRecord(job.payload);

  switch (job.job_type) {
    case "notification_single": {
      const userId = asString(payload.userId);
      if (!userId) throw new Error("notification_single requires userId");

      const inserted = await insertNotifications(supabase, [{
        user_id: userId,
        title: asString(payload.title),
        message: asString(payload.message),
        type: asString(payload.type) || "system",
        action_url: asString(payload.actionUrl) || null,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

      return { inserted };
    }

    case "notification_bulk": {
      const userIds = asStringArray(payload.userIds);
      if (userIds.length === 0) throw new Error("notification_bulk requires userIds");

      const now = new Date().toISOString();
      const rows = userIds.map((userId) => ({
        user_id: userId,
        title: asString(payload.title),
        message: asString(payload.message),
        type: asString(payload.type) || "system",
        action_url: asString(payload.actionUrl) || null,
        read: false,
        created_at: now,
        updated_at: now,
      }));

      const inserted = await insertNotifications(supabase, rows);
      return { inserted };
    }

    case "announcement_notifications": {
      const { data, error } = await supabase.rpc("enqueue_announcement_notifications", {
        p_announcement_id: asString(payload.announcementId),
        p_title: asString(payload.title),
        p_message: asString(payload.message),
      });
      if (error) throw new Error(error.message || "Failed to queue announcement notifications");
      return { queued: Number(data) || 0 };
    }

    case "meeting_notifications": {
      const { data, error } = await supabase.rpc("enqueue_meeting_notifications", {
        p_meeting_id: asString(payload.meetingId),
        p_title: asString(payload.title),
        p_scheduled_date: asString(payload.scheduledDate),
        p_notification_type: asString(payload.type) || "scheduled",
        p_venue: asString(payload.venue) || null,
        p_recipient_scope: asString(payload.recipientScope) || "all_members",
      });
      if (error) throw new Error(error.message || "Failed to queue meeting notifications");
      return { queued: Number(data) || 0 };
    }

    case "sms_bulk":
      return await invokeFunction("sms-reminders", {
        limit: Number(payload.limit) || 50,
        dry_run: payload.dryRun === true,
      });

    case "whatsapp_bulk":
      return await invokeFunction("whatsapp-notification-worker", {
        limit: Number(payload.limit) || 50,
        dry_run: payload.dryRun === true,
        include_abandonment: payload.includeAbandonment !== false,
        retry_failed: payload.retryFailed === true,
      });

    case "reminder_batch": {
      const channel = asString(payload.channel);
      if (channel === "sms") {
        return await invokeFunction("sms-reminders", { limit: Number(payload.limit) || 50 });
      }
      if (channel === "whatsapp") {
        return await invokeFunction("whatsapp-notification-worker", { limit: Number(payload.limit) || 50 });
      }
      throw new Error("reminder_batch requires channel sms or whatsapp");
    }

    case "mpesa_status_recheck":
      return await invokeFunction("mpesa", {
        action: "query_status",
        checkoutRequestId: asString(payload.checkoutRequestId),
      });

    case "mpesa_url_registration":
      return await invokeFunction("mpesa", { action: "register_urls" });

    case "admin_report_export":
    case "report_export": {
      const { data, error } = await supabase.rpc("get_reports_summary", {
        p_start: payload.start ?? null,
        p_end: payload.end ?? null,
      });
      if (error) throw new Error(error.message || "Failed to generate report export");
      return {
        reportType: asString(payload.reportType) || "summary",
        format: asString(payload.format) || "txt",
        generatedAt: new Date().toISOString(),
        summary: data ?? null,
      };
    }

    case "audit_log_export":
    case "announcement_export":
    case "member_export":
    case "welfare_export":
    case "accounting_export":
    case "payments_export":
    case "bulk_import":
    case "payment_reconciliation":
    case "email_bulk":
      return {
        accepted: true,
        jobType: job.job_type,
        payload,
        note: "Job accepted for asynchronous processing. Attach a specialized worker for file delivery or provider-specific sending.",
      };

    default:
      throw new Error(`Unsupported job type: ${job.job_type}`);
  }
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ensureAuthorized(req);
    const body = req.method === "POST" ? await readJsonBody<WorkerRequest>(req) : {};
    const { limit, dryRun } = parseBody(body);
    const supabase = createServiceClient();

    const { data: claimedJobs, error: claimError } = await supabase.rpc("claim_background_jobs", {
      p_worker: WORKER_NAME,
      p_limit: limit,
    });

    if (claimError) {
      throw new HttpError(500, "Failed to claim background jobs", claimError);
    }

    const jobs = (claimedJobs ?? []) as BackgroundJobRow[];
    const results: Array<Record<string, unknown>> = [];

    for (const job of jobs) {
      if (dryRun) {
        results.push({ id: job.id, job_type: job.job_type, dry_run: true });
        continue;
      }

      try {
        const result = await processJob(supabase, job);
        const { error: completeError } = await supabase.rpc("complete_background_job", {
          p_job_id: job.id,
          p_result_payload: result,
        });
        if (completeError) {
          throw new Error(completeError.message || "Failed to complete background job");
        }
        results.push({ id: job.id, job_type: job.job_type, status: "completed", result });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const { error: failError } = await supabase.rpc("fail_background_job", {
          p_job_id: job.id,
          p_error: message,
          p_retry_seconds: null,
        });
        if (failError) {
          console.error("Failed to mark background job failed", failError);
        }
        results.push({ id: job.id, job_type: job.job_type, status: "failed", error: message });
      }
    }

    return jsonResponse({
      ok: true,
      claimed: jobs.length,
      processed: results.length,
      dry_run: dryRun,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
