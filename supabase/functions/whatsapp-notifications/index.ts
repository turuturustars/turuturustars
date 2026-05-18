import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-whatsapp-notification-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const WHATSAPP_GRAPH_VERSION = Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v21.0";
const WHATSAPP_NOTIFICATION_SECRET = Deno.env.get("WHATSAPP_NOTIFICATION_SECRET") ?? "";
const DEFAULT_LANGUAGE_CODE = Deno.env.get("WHATSAPP_DEFAULT_LANGUAGE_CODE") ?? "en";

type SupabaseClient = ReturnType<typeof createClient>;

interface DispatchRequest {
  notificationIds?: string[];
  limit?: number;
  force?: boolean;
  templateName?: string;
  languageCode?: string;
  templateParameters?: string[];
}

interface NotificationRecord {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  sent_via: string[] | null;
  whatsapp_status: string | null;
}

interface ProfileRecord {
  id: string;
  full_name: string | null;
  phone: string | null;
}

interface ContactRecord {
  id: string;
  wa_id: string;
  opted_in: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    assertWhatsAppConfigured();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await authenticateDispatcher(supabase, req);

    const body = (await req.json()) as DispatchRequest;
    const notifications = await fetchNotifications(supabase, body);
    const profiles = await fetchProfiles(supabase, notifications);
    const results = [];

    for (const notification of notifications) {
      const profile = notification.user_id ? profiles.get(notification.user_id) : null;

      if (!profile?.phone) {
        await markNotification(supabase, notification, "skipped", null, "No member phone number");
        results.push({ notificationId: notification.id, status: "skipped", reason: "missing_phone" });
        continue;
      }

      const contact = await upsertContact(supabase, profile);
      if (!contact.opted_in && !body.force) {
        await markNotification(supabase, notification, "skipped", null, "WhatsApp contact opted out");
        await logAutomationEvent(supabase, notification, contact, "skipped", "WhatsApp contact opted out");
        results.push({ notificationId: notification.id, status: "skipped", reason: "opted_out" });
        continue;
      }

      try {
        const response = await sendWhatsAppNotification(contact.wa_id, notification, body);
        const waMessageId = response?.messages?.[0]?.id ?? null;

        await supabase.from("whatsapp_messages").insert({
          contact_id: contact.id,
          member_id: profile.id,
          wa_message_id: waMessageId,
          direction: "outbound",
          message_type: body.templateName ? "template" : "text",
          text_body: notificationText(notification),
          payload: response ?? {},
          status: waMessageId ? "sent" : "failed",
        });

        await supabase
          .from("whatsapp_contacts")
          .update({ last_outbound_at: new Date().toISOString() })
          .eq("id", contact.id);

        await markNotification(supabase, notification, "sent", waMessageId, null);
        await logAutomationEvent(supabase, notification, contact, "sent");
        results.push({ notificationId: notification.id, status: "sent", waMessageId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "WhatsApp notification failed";
        await markNotification(supabase, notification, "failed", null, message);
        await logAutomationEvent(supabase, notification, contact, "failed", message);
        results.push({ notificationId: notification.id, status: "failed", error: message });
      }
    }

    return jsonResponse({ ok: true, count: results.length, results }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp notification dispatch failed";
    console.error("WhatsApp notification dispatch failed:", error);
    return jsonResponse({ ok: false, error: message }, 400);
  }
});

async function authenticateDispatcher(supabase: SupabaseClient, req: Request) {
  const secret = req.headers.get("x-whatsapp-notification-secret");
  if (WHATSAPP_NOTIFICATION_SECRET && secret === WHATSAPP_NOTIFICATION_SECRET) {
    return;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    throw rolesError;
  }

  const allowedRoles = new Set([
    "admin",
    "chairperson",
    "vice_chairman",
    "secretary",
    "vice_secretary",
    "treasurer",
    "organizing_secretary",
  ]);

  const allowed = roles?.some((row: { role: string }) => allowedRoles.has(row.role));
  if (!allowed) {
    throw new Error("Only officials can dispatch WhatsApp notifications");
  }
}

async function fetchNotifications(supabase: SupabaseClient, body: DispatchRequest): Promise<NotificationRecord[]> {
  let query = supabase
    .from("notifications")
    .select("id, user_id, title, message, type, sent_via, whatsapp_status")
    .not("user_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(Math.min(Math.max(body.limit ?? 25, 1), 100));

  if (body.notificationIds?.length) {
    query = query.in("id", body.notificationIds);
  } else {
    query = query.eq("whatsapp_status", "queued");
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as NotificationRecord[];
}

async function fetchProfiles(supabase: SupabaseClient, notifications: NotificationRecord[]) {
  const userIds = Array.from(new Set(notifications.map((notification) => notification.user_id).filter(Boolean))) as string[];
  if (!userIds.length) {
    return new Map<string, ProfileRecord>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", userIds);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile as ProfileRecord]));
}

async function upsertContact(supabase: SupabaseClient, profile: ProfileRecord): Promise<ContactRecord> {
  const waId = normalizeWhatsappPhone(profile.phone ?? "");
  const { data, error } = await supabase
    .from("whatsapp_contacts")
    .upsert({
      wa_id: waId,
      phone_number: waId,
      member_id: profile.id,
      profile_name: profile.full_name ?? null,
      last_bot_mode: "member",
      updated_at: new Date().toISOString(),
    }, { onConflict: "wa_id" })
    .select("id, wa_id, opted_in")
    .single();

  if (error) {
    throw error;
  }

  return data as ContactRecord;
}

async function sendWhatsAppNotification(to: string, notification: NotificationRecord, request: DispatchRequest) {
  const payload = request.templateName
    ? templatePayload(to, notification, request)
    : textPayload(to, notificationText(notification));

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || "WhatsApp API request failed");
  }

  return result;
}

function textPayload(to: string, text: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: text.length > 3900 ? `${text.slice(0, 3890)}...` : text,
    },
  };
}

function templatePayload(to: string, notification: NotificationRecord, request: DispatchRequest) {
  const parameters = request.templateParameters?.length
    ? request.templateParameters
    : [notification.title, notification.message];

  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: request.templateName,
      language: { code: request.languageCode ?? DEFAULT_LANGUAGE_CODE },
      components: [
        {
          type: "body",
          parameters: parameters.map((parameter) => ({
            type: "text",
            text: parameter,
          })),
        },
      ],
    },
  };
}

async function markNotification(
  supabase: SupabaseClient,
  notification: NotificationRecord,
  status: "sent" | "failed" | "skipped",
  waMessageId: string | null,
  errorMessage: string | null,
) {
  const sentVia = Array.from(new Set([...(notification.sent_via ?? []), "whatsapp"]));

  const { error } = await supabase
    .from("notifications")
    .update({
      sent_via: sentVia,
      whatsapp_status: status,
      whatsapp_message_id: waMessageId,
      whatsapp_sent_at: status === "sent" ? new Date().toISOString() : null,
      whatsapp_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notification.id);

  if (error) {
    console.error("Failed to update WhatsApp notification status:", error);
  }
}

async function logAutomationEvent(
  supabase: SupabaseClient,
  notification: NotificationRecord,
  contact: ContactRecord,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string,
) {
  await supabase.from("whatsapp_automation_events").insert({
    event_type: "notification",
    source_table: "notifications",
    source_id: notification.id,
    contact_id: contact.id,
    member_id: notification.user_id,
    payload: {
      title: notification.title,
      type: notification.type,
    },
    status,
    error_message: errorMessage ?? null,
    processed_at: new Date().toISOString(),
  });
}

function notificationText(notification: NotificationRecord) {
  return [notification.title, notification.message].filter(Boolean).join("\n");
}

function normalizeWhatsappPhone(phone: string) {
  const digits = normalizeDigits(phone);
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return `254${digits}`;
  return digits;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function assertWhatsAppConfigured() {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp credentials are not configured");
  }
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
