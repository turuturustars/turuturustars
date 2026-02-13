import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";

type SmsQueueRow = {
  id: string;
  phone: string;
  message: string;
  attempts: number;
};

type ProcessSmsRequest = {
  limit?: number;
  dry_run?: boolean;
};

const SMS_ENDPOINT = Deno.env.get("SMS_LEOPARD_SEND_URL")?.trim() || "https://api.smsleopard.com/v1/sms/send";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_MAX_ATTEMPTS = 5;

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

function resolveAccessToken(): string {
  const explicitToken = Deno.env.get("SMS_LEOPARD_ACCESS_TOKEN")?.trim();
  if (explicitToken) {
    return explicitToken;
  }

  const apiKey = Deno.env.get("SMS_LEOPARD_API_KEY")?.trim();
  const apiSecret = Deno.env.get("SMS_LEOPARD_API_SECRET")?.trim();
  if (!apiKey || !apiSecret) {
    throw new HttpError(500, "Missing SMSLeopard credentials");
  }

  return btoa(`${apiKey}:${apiSecret}`);
}

function ensureAuthorized(req: Request): void {
  const expectedSecret = Deno.env.get("SMS_REMINDERS_JOB_SECRET")?.trim();
  if (!expectedSecret) {
    return;
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const customHeader = req.headers.get("x-sms-job-secret")?.trim() || "";

  if (bearer !== expectedSecret && customHeader !== expectedSecret) {
    throw new HttpError(401, "Unauthorized");
  }
}

function parseBody(body: ProcessSmsRequest | null | undefined) {
  const rawLimit = body?.limit;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(MAX_LIMIT, Number(rawLimit))) : DEFAULT_LIMIT;
  const dryRun = body?.dry_run === true;
  const maxAttemptsRaw = Number(Deno.env.get("SMS_REMINDERS_MAX_ATTEMPTS") || "");
  const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0
    ? Math.floor(maxAttemptsRaw)
    : DEFAULT_MAX_ATTEMPTS;

  return { limit, dryRun, maxAttempts };
}

async function sendViaSmsLeopard(destination: string, message: string): Promise<{
  providerMessageId: string | null;
  providerResponse: unknown;
}> {
  const accessToken = resolveAccessToken();
  const sourceId = Deno.env.get("SMS_LEOPARD_SOURCE_ID")?.trim();
  const destinationNumber = destination.startsWith("+") ? destination.slice(1) : destination;

  const payload: Record<string, unknown> = {
    destination: [{ number: destinationNumber }],
    message,
  };
  if (sourceId) {
    payload.source = sourceId;
  }

  const response = await fetch(SMS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw;
  }

  const payloadObj = parsed as Record<string, unknown> | null;
  const providerMessage = typeof payloadObj?.message === "string" ? payloadObj.message : null;

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500 && providerMessage) {
      throw new HttpError(400, providerMessage, {
        status: response.status,
        response: parsed,
      });
    }

    throw new HttpError(502, providerMessage || "SMSLeopard send failed", {
      status: response.status,
      response: parsed,
    });
  }

  if (payloadObj?.success === false) {
    throw new HttpError(400, providerMessage || "SMSLeopard rejected SMS request", payloadObj);
  }

  const providerMessageId =
    (payloadObj?.message_id as string | undefined) ??
    (payloadObj?.id as string | undefined) ??
    ((payloadObj?.data as Record<string, unknown> | undefined)?.message_id as string | undefined) ??
    ((payloadObj?.data as Record<string, unknown> | undefined)?.id as string | undefined) ??
    null;

  return {
    providerMessageId,
    providerResponse: parsed,
  };
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sms-job-secret",
      },
    });
  }

  try {
    if (req.method !== "POST" && req.method !== "GET") {
      throw new HttpError(405, "Method not allowed");
    }

    ensureAuthorized(req);

    const body = req.method === "POST" ? await readJsonBody<ProcessSmsRequest>(req) : {};
    const { limit, dryRun, maxAttempts } = parseBody(body);
    const nowIso = new Date().toISOString();
    const supabase = createServiceClient();

    const { data: pendingRows, error: pendingError } = await supabase
      .from("sms_notifications_queue")
      .select("id, phone, message, attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (pendingError) {
      throw new HttpError(500, "Failed to load pending SMS queue rows", pendingError);
    }

    const pending = (pendingRows || []) as SmsQueueRow[];
    if (pending.length === 0) {
      return jsonResponse({
        ok: true,
        claimed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const pendingIds = pending.map((row) => row.id);
    const { data: claimedRows, error: claimError } = await supabase
      .from("sms_notifications_queue")
      .update({
        status: "processing",
        updated_at: nowIso,
      })
      .in("id", pendingIds)
      .eq("status", "pending")
      .select("id, phone, message, attempts");

    if (claimError) {
      throw new HttpError(500, "Failed to claim SMS queue rows", claimError);
    }

    const claimed = (claimedRows || []) as SmsQueueRow[];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of claimed) {
      const nextAttempts = row.attempts + 1;

      if (!/^\+254[17]\d{8}$/.test(row.phone)) {
        skipped += 1;
        await supabase
          .from("sms_notifications_queue")
          .update({
            status: "skipped",
            attempts: nextAttempts,
            last_error: "Invalid normalized destination number",
            processed_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", row.id);
        continue;
      }

      if (dryRun) {
        skipped += 1;
        await supabase
          .from("sms_notifications_queue")
          .update({
            status: "pending",
            updated_at: nowIso,
          })
          .eq("id", row.id);
        continue;
      }

      try {
        const result = await sendViaSmsLeopard(row.phone, row.message);
        sent += 1;

        await supabase
          .from("sms_notifications_queue")
          .update({
            status: "sent",
            attempts: nextAttempts,
            provider_message_id: result.providerMessageId,
            provider_response: result.providerResponse,
            last_error: null,
            processed_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", row.id);
      } catch (error) {
        failed += 1;
        const errorMessage = error instanceof Error ? error.message : "Unknown SMS send error";
        const terminalFailure = nextAttempts >= maxAttempts;

        await supabase
          .from("sms_notifications_queue")
          .update({
            status: terminalFailure ? "failed" : "pending",
            attempts: nextAttempts,
            last_error: errorMessage,
            processed_at: terminalFailure ? nowIso : null,
            updated_at: nowIso,
          })
          .eq("id", row.id);
      }
    }

    return jsonResponse({
      ok: true,
      claimed: claimed.length,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("sms-reminders failed", error);
    return errorResponse(error);
  }
});
