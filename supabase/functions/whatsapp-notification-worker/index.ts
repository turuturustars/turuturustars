import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";

type WhatsAppQueueRow = {
  id: string;
  user_id: string;
  phone: string;
  message: string;
  attempts: number;
};

type WhatsAppSessionRow = {
  id: string;
  phone: string;
  profile_id: string | null;
  preferred_language: "auto" | "en" | "sw";
  last_intent: string | null;
  state: Record<string, unknown> | null;
  awaiting_response_since: string | null;
  last_outbound_at: string | null;
};

type ProcessWhatsAppRequest = {
  limit?: number;
  abandonment_limit?: number;
  include_abandonment?: boolean;
  dry_run?: boolean;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_GRAPH_API_VERSION = "v20.0";
const DEFAULT_ABANDONMENT_MINUTES = 3;

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
  const expectedSecret = (
    Deno.env.get("WHATSAPP_NOTIFICATIONS_JOB_SECRET") ||
    Deno.env.get("WHATSAPP_NOTIFICATION_SECRET") ||
    ""
  ).trim();
  if (!expectedSecret) {
    return;
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const customHeader = req.headers.get("x-whatsapp-job-secret")?.trim() || "";

  if (bearer !== expectedSecret && customHeader !== expectedSecret) {
    throw new HttpError(401, "Unauthorized");
  }
}

function parseBody(body: ProcessWhatsAppRequest | null | undefined) {
  const rawLimit = body?.limit;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(MAX_LIMIT, Number(rawLimit))) : DEFAULT_LIMIT;
  const rawAbandonmentLimit = body?.abandonment_limit ?? rawLimit;
  const abandonmentLimit = Number.isFinite(rawAbandonmentLimit)
    ? Math.max(1, Math.min(MAX_LIMIT, Number(rawAbandonmentLimit)))
    : DEFAULT_LIMIT;
  const dryRun = body?.dry_run === true;
  const includeAbandonment = body?.include_abandonment !== false;
  const maxAttemptsRaw = Number(Deno.env.get("WHATSAPP_NOTIFICATIONS_MAX_ATTEMPTS") || "");
  const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0
    ? Math.floor(maxAttemptsRaw)
    : DEFAULT_MAX_ATTEMPTS;
  const abandonmentMinutesRaw = Number(Deno.env.get("WHATSAPP_ABANDONMENT_MINUTES") || "");
  const abandonmentMinutes = Number.isFinite(abandonmentMinutesRaw) && abandonmentMinutesRaw > 0
    ? abandonmentMinutesRaw
    : DEFAULT_ABANDONMENT_MINUTES;

  return { limit, abandonmentLimit, includeAbandonment, dryRun, maxAttempts, abandonmentMinutes };
}

async function sendViaWhatsAppCloud(destination: string, message: string): Promise<{
  providerMessageId: string | null;
  providerResponse: unknown;
}> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();
  if (!accessToken || !phoneNumberId) {
    throw new HttpError(500, "Missing WhatsApp Cloud API credentials");
  }

  const graphVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION")?.trim() || DEFAULT_GRAPH_API_VERSION;
  const destinationNumber = destination.startsWith("+") ? destination.slice(1) : destination;
  const endpoint = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: destinationNumber,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw;
  }

  const payloadObj = parsed as Record<string, unknown> | null;
  const errorObj = payloadObj?.error as Record<string, unknown> | undefined;
  const providerMessage = typeof errorObj?.message === "string" ? errorObj.message : null;

  if (!response.ok) {
    throw new HttpError(response.status >= 400 && response.status < 500 ? 400 : 502, providerMessage || "WhatsApp send failed", {
      status: response.status,
      response: parsed,
    });
  }

  const messages = Array.isArray(payloadObj?.messages)
    ? (payloadObj?.messages as Array<Record<string, unknown>>)
    : [];
  const providerMessageId = typeof messages[0]?.id === "string" ? messages[0].id : null;

  return {
    providerMessageId,
    providerResponse: parsed,
  };
}

function isValidWhatsAppDestination(phone: string): boolean {
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return /^254[17]\d{8}$/.test(digits);
}

function seededIndex(seed: string, count: number): number {
  if (count <= 1) return 0;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % count;
}

function nairobiHour(now: Date): number {
  try {
    const hour = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      hour: "2-digit",
      hour12: false,
    }).format(now);
    const parsed = Number(hour);
    if (Number.isFinite(parsed)) return parsed;
  } catch {
    // Fall through to UTC+3 arithmetic when the runtime lacks timezone data.
  }

  return (now.getUTCHours() + 3) % 24;
}

function timeWish(language: "auto" | "en" | "sw", now: Date): string {
  const hour = nairobiHour(now);
  const sw = language === "sw";
  if (hour < 5) return sw ? "usiku mwema" : "have a good night";
  if (hour < 12) return sw ? "asubuhi njema" : "have a good morning";
  if (hour < 17) return sw ? "mchana mwema" : "have a good afternoon";
  if (hour < 21) return sw ? "jioni njema" : "have a good evening";
  return sw ? "usiku mwema" : "have a good night";
}

function conversationContextLabel(state: Record<string, unknown> | null, language: "auto" | "en" | "sw"): string {
  const sw = language === "sw";
  const registration = state?.registration as Record<string, unknown> | undefined;
  const registrationStep = typeof registration?.step === "string" ? registration.step : null;
  const pendingIntentObj = state?.pending_intent as Record<string, unknown> | undefined;
  const pendingIntent = typeof pendingIntentObj?.intent === "string" ? pendingIntentObj.intent : null;

  if (registrationStep === "confirm_phone") {
    return sw ? "tulikuwa tunathibitisha nambari ya usajili" : "we were confirming the registration number";
  }
  if (registrationStep === "awaiting_email") {
    return sw ? "tulikuwa kwenye hatua ya email" : "we were at the email step";
  }
  if (registrationStep === "awaiting_email_otp") {
    return sw ? "tulikuwa tunasubiri OTP" : "we were waiting for the OTP";
  }
  if (registrationStep === "awaiting_profile_required") {
    return sw ? "tulikuwa tunakamilisha details muhimu" : "we were filling the required details";
  }
  if (registrationStep === "awaiting_profile_optional") {
    return sw ? "tulikuwa kwenye details za ziada" : "we were on the optional details";
  }
  if (pendingIntent === "record_contribution") {
    return sw ? "tulikuwa tunamalizia kurekodi transaction" : "we were finishing a transaction record";
  }
  if (pendingIntent === "record_expenditure") {
    return sw ? "tulikuwa tunamalizia expenditure" : "we were finishing an expenditure record";
  }
  if (pendingIntent === "create_welfare_case") {
    return sw ? "tulikuwa tunafungua welfare case" : "we were opening a welfare case";
  }
  if (pendingIntent === "update_profile") {
    return sw ? "tulikuwa tunasasisha profile" : "we were updating a profile";
  }

  return sw ? "tutaendelea ukirudi" : "we can continue when you return";
}

function abandonmentReply(session: WhatsAppSessionRow, now: Date): string {
  const language = session.preferred_language === "sw" ? "sw" : "en";
  const context = conversationContextLabel(session.state, language);
  const wish = timeWish(language, now);
  const seed = `${session.phone}:${session.awaiting_response_since || ""}:${context}:${nairobiHour(now)}`;

  if (language === "sw") {
    const variants = [
      `Nitasimama hapa kwa sasa. Inaonekana uko mbali kidogo; ${context}. ${wish}. Ukirudi, reply tu na tutaendelea.`,
      `Naona mazungumzo yamepumzika kwa dakika chache. Sitakusumbua tena kwa sasa; ${context}. ${wish}.`,
      `Nitafunga hatua hii kwa upole kwa sasa. Inaonekana haupo karibu; ${context}. ${wish}.`,
      `Nimekuachia nafasi kidogo. Kwa sasa nitasubiri mpaka urudi; ${context}. ${wish}.`,
    ];
    return variants[seededIndex(seed, variants.length)];
  }

  const variants = [
    `I will pause here for now. It feels like you stepped away; ${context}. ${wish}. Reply anytime and I will continue.`,
    `Looks like the chat has gone quiet for a few minutes. I will stop nudging for now; ${context}. ${wish}.`,
    `I will close this step gently for now. It seems you are not present; ${context}. ${wish}.`,
    `I am giving you some space for now. I saved where we reached; ${context}. ${wish}.`,
  ];
  return variants[seededIndex(seed, variants.length)];
}

async function processAbandonedConversations(
  supabase: ReturnType<typeof createServiceClient>,
  options: { limit: number; dryRun: boolean; abandonmentMinutes: number },
): Promise<{ checked: number; claimed: number; sent: number; failed: number; skipped: number }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - options.abandonmentMinutes * 60 * 1000).toISOString();

  const { data: staleRows, error: staleError } = await supabase
    .from("whatsapp_sessions")
    .select("id, phone, profile_id, preferred_language, last_intent, state, awaiting_response_since, last_outbound_at")
    .eq("awaiting_response", true)
    .is("inactivity_notice_sent_at", null)
    .lte("awaiting_response_since", cutoffIso)
    .lte("last_inbound_at", cutoffIso)
    .lte("last_outbound_at", cutoffIso)
    .order("awaiting_response_since", { ascending: true })
    .limit(options.limit);

  if (staleError) {
    throw new HttpError(500, "Failed to load abandoned WhatsApp sessions", staleError);
  }

  const stale = (staleRows || []) as WhatsAppSessionRow[];
  if (stale.length === 0) {
    return { checked: 0, claimed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const { data: claimedRows, error: claimError } = await supabase
    .from("whatsapp_sessions")
    .update({
      inactivity_notice_sent_at: nowIso,
      updated_at: nowIso,
    })
    .in("id", stale.map((row) => row.id))
    .eq("awaiting_response", true)
    .is("inactivity_notice_sent_at", null)
    .lte("last_inbound_at", cutoffIso)
    .lte("last_outbound_at", cutoffIso)
    .select("id, phone, profile_id, preferred_language, last_intent, state, awaiting_response_since, last_outbound_at");

  if (claimError) {
    throw new HttpError(500, "Failed to claim abandoned WhatsApp sessions", claimError);
  }

  const claimed = (claimedRows || []) as WhatsAppSessionRow[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const session of claimed) {
    if (!isValidWhatsAppDestination(session.phone)) {
      skipped += 1;
      await supabase
        .from("whatsapp_sessions")
        .update({
          awaiting_response: false,
          abandoned_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", session.id);
      continue;
    }

    if (options.dryRun) {
      skipped += 1;
      await supabase
        .from("whatsapp_sessions")
        .update({
          inactivity_notice_sent_at: null,
          updated_at: nowIso,
        })
        .eq("id", session.id);
      continue;
    }

    const message = abandonmentReply(session, now);
    try {
      const result = await sendViaWhatsAppCloud(session.phone, message);
      sent += 1;

      const { error: messageError } = await supabase
        .from("whatsapp_messages")
        .insert({
          provider_message_id: result.providerMessageId,
          direction: "outbound",
          phone: session.phone,
          profile_id: session.profile_id,
          message_type: "text",
          body: message,
          status: "sent",
          provider_response: result.providerResponse,
          raw_payload: {},
        });

      if (messageError) {
        console.warn("WhatsApp abandonment audit insert failed", messageError);
      }

      await supabase
        .from("whatsapp_sessions")
        .update({
          awaiting_response: false,
          abandoned_at: nowIso,
          last_outbound_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", session.id);
    } catch (error) {
      failed += 1;
      console.warn("WhatsApp abandonment send failed", error);
      await supabase
        .from("whatsapp_sessions")
        .update({
          inactivity_notice_sent_at: null,
          updated_at: nowIso,
        })
        .eq("id", session.id);
    }
  }

  return {
    checked: stale.length,
    claimed: claimed.length,
    sent,
    failed,
    skipped,
  };
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-whatsapp-job-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version",
      },
    });
  }

  try {
    if (req.method !== "POST" && req.method !== "GET") {
      throw new HttpError(405, "Method not allowed");
    }

    ensureAuthorized(req);

    const body = req.method === "POST" ? await readJsonBody<ProcessWhatsAppRequest>(req) : {};
    const { limit, abandonmentLimit, includeAbandonment, dryRun, maxAttempts, abandonmentMinutes } = parseBody(body);
    const nowIso = new Date().toISOString();
    const supabase = createServiceClient();
    let queueClaimed = 0;
    let queueSent = 0;
    let queueFailed = 0;
    let queueSkipped = 0;

    const { data: pendingRows, error: pendingError } = await supabase
      .from("whatsapp_notifications_queue")
      .select("id, user_id, phone, message, attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (pendingError) {
      throw new HttpError(500, "Failed to load pending WhatsApp queue rows", pendingError);
    }

    const pending = (pendingRows || []) as WhatsAppQueueRow[];
    if (pending.length > 0) {
      const pendingIds = pending.map((row) => row.id);
      const { data: claimedRows, error: claimError } = await supabase
        .from("whatsapp_notifications_queue")
        .update({
          status: "processing",
          updated_at: nowIso,
        })
        .in("id", pendingIds)
        .eq("status", "pending")
        .select("id, user_id, phone, message, attempts");

      if (claimError) {
        throw new HttpError(500, "Failed to claim WhatsApp queue rows", claimError);
      }

      const claimed = (claimedRows || []) as WhatsAppQueueRow[];
      queueClaimed = claimed.length;

      for (const row of claimed) {
        const nextAttempts = row.attempts + 1;

        if (!isValidWhatsAppDestination(row.phone)) {
          queueSkipped += 1;
          await supabase
            .from("whatsapp_notifications_queue")
            .update({
              status: "skipped",
              attempts: nextAttempts,
              last_error: "Invalid normalized WhatsApp destination number",
              processed_at: nowIso,
              updated_at: nowIso,
            })
            .eq("id", row.id);
          continue;
        }

        if (dryRun) {
          queueSkipped += 1;
          await supabase
            .from("whatsapp_notifications_queue")
            .update({
              status: "pending",
              updated_at: nowIso,
            })
            .eq("id", row.id);
          continue;
        }

        try {
          const result = await sendViaWhatsAppCloud(row.phone, row.message);
          queueSent += 1;

          const { data: messageRows, error: messageError } = await supabase
            .from("whatsapp_messages")
            .insert({
              provider_message_id: result.providerMessageId,
              direction: "outbound",
              phone: row.phone,
              profile_id: row.user_id,
              message_type: "text",
              body: row.message,
              status: "sent",
              provider_response: result.providerResponse,
              raw_payload: {},
            })
            .select("id")
            .limit(1);

          if (messageError) {
            console.warn("WhatsApp message audit insert failed", messageError);
          }

          await supabase
            .from("whatsapp_notifications_queue")
            .update({
              status: "sent",
              attempts: nextAttempts,
              provider_message_id: result.providerMessageId,
              provider_response: result.providerResponse,
              whatsapp_message_id: messageRows?.[0]?.id ?? null,
              last_error: null,
              processed_at: nowIso,
              updated_at: nowIso,
            })
            .eq("id", row.id);
        } catch (error) {
          queueFailed += 1;
          const errorMessage = error instanceof Error ? error.message : "Unknown WhatsApp send error";
          const terminalFailure = nextAttempts >= maxAttempts;

          await supabase
            .from("whatsapp_notifications_queue")
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
    }

    const abandonment = includeAbandonment
      ? await processAbandonedConversations(supabase, {
        limit: abandonmentLimit,
        dryRun,
        abandonmentMinutes,
      })
      : { checked: 0, claimed: 0, sent: 0, failed: 0, skipped: 0 };

    return jsonResponse({
      ok: true,
      queue: {
        claimed: queueClaimed,
        sent: queueSent,
        failed: queueFailed,
        skipped: queueSkipped,
      },
      abandonment,
    });
  } catch (error) {
    console.error("whatsapp-notifications failed", error);
    return errorResponse(error);
  }
});
