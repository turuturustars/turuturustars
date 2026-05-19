import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const WHATSAPP_GRAPH_VERSION =
  Deno.env.get("WHATSAPP_GRAPH_API_VERSION") ?? Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v21.0";
const DEFAULT_LANGUAGE_CODE = Deno.env.get("WHATSAPP_DEFAULT_LANGUAGE_CODE") ?? "en";

type SupabaseClient = ReturnType<typeof createClient>;

interface OutboundRequest {
  to?: string | string[];
  memberIds?: string[];
  audience?: "all_members";
  text?: string;
  templateName?: string;
  languageCode?: string;
  templateParameters?: string[];
  sourceType?: string;
  sourceId?: string;
  force?: boolean;
}

interface Recipient {
  memberId: string | null;
  phone: string;
  fullName?: string | null;
}

interface ContactRecord {
  id: string;
  wa_id: string;
  phone_number: string;
  member_id: string | null;
  opted_in: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    assertWhatsAppConfigured();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await authenticateOfficial(supabase, req);

    const body = (await req.json()) as OutboundRequest;
    validateOutboundRequest(body);

    const recipients = await resolveRecipients(supabase, body);
    const results = [];

    for (const recipient of recipients) {
      const contact = await upsertContact(supabase, recipient);

      if (!contact.opted_in && !body.force) {
        await logAutomationEvent(supabase, body, recipient, contact, "skipped", "Recipient opted out");
        results.push({ to: contact.wa_id, status: "skipped", reason: "opted_out" });
        continue;
      }

      try {
        const response = await sendWhatsAppMessage(contact.wa_id, body);
        const waMessageId = response?.messages?.[0]?.id ?? null;

        await supabase.from("whatsapp_messages").insert({
          contact_id: contact.id,
          member_id: recipient.memberId,
          wa_message_id: waMessageId,
          direction: "outbound",
          message_type: body.templateName ? "template" : "text",
          text_body: body.text ?? body.templateName ?? "",
          payload: response ?? {},
          status: waMessageId ? "sent" : "failed",
        });

        await supabase
          .from("whatsapp_contacts")
          .update({ last_outbound_at: new Date().toISOString() })
          .eq("id", contact.id);

        await logAutomationEvent(supabase, body, recipient, contact, "sent");
        results.push({ to: contact.wa_id, status: "sent", waMessageId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "WhatsApp send failed";
        await logAutomationEvent(supabase, body, recipient, contact, "failed", message);
        results.push({ to: contact.wa_id, status: "failed", error: message });
      }
    }

    return jsonResponse({ ok: true, count: results.length, results }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp send failed";
    console.error("WhatsApp send function failed:", error);
    return jsonResponse({ ok: false, error: message }, 400);
  }
});

async function authenticateOfficial(supabase: SupabaseClient, req: Request) {
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
    throw new Error("Only officials can send WhatsApp messages");
  }
}

function validateOutboundRequest(body: OutboundRequest) {
  if (!body.text && !body.templateName) {
    throw new Error("Provide text or templateName");
  }

  if (!body.to && !body.memberIds?.length && !body.audience) {
    throw new Error("Provide to, memberIds, or audience");
  }
}

async function resolveRecipients(supabase: SupabaseClient, body: OutboundRequest): Promise<Recipient[]> {
  const recipients = new Map<string, Recipient>();

  for (const phone of normalizeToList(body.to)) {
    const normalized = normalizeDigits(phone);
    if (normalized) {
      recipients.set(normalized, { phone: normalized, memberId: null });
    }
  }

  if (body.memberIds?.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, phone, full_name")
      .in("id", body.memberIds);

    if (error) throw error;

    for (const profile of data ?? []) {
      const phone = normalizeDigits(profile.phone);
      if (phone) {
        recipients.set(phone, {
          phone,
          memberId: profile.id,
          fullName: profile.full_name,
        });
      }
    }
  }

  if (body.audience === "all_members") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, phone, full_name")
      .eq("status", "active")
      .not("phone", "is", null);

    if (error) throw error;

    for (const profile of data ?? []) {
      const phone = normalizeDigits(profile.phone);
      if (phone) {
        recipients.set(phone, {
          phone,
          memberId: profile.id,
          fullName: profile.full_name,
        });
      }
    }
  }

  return Array.from(recipients.values());
}

async function upsertContact(supabase: SupabaseClient, recipient: Recipient): Promise<ContactRecord> {
  const waId = normalizeWhatsappPhone(recipient.phone);
  const { data, error } = await supabase
    .from("whatsapp_contacts")
    .upsert({
      wa_id: waId,
      phone_number: waId,
      member_id: recipient.memberId,
      profile_name: recipient.fullName ?? null,
      last_bot_mode: recipient.memberId ? "member" : "public",
      updated_at: new Date().toISOString(),
    }, { onConflict: "wa_id" })
    .select("id, wa_id, phone_number, member_id, opted_in")
    .single();

  if (error) throw error;
  return data as ContactRecord;
}

async function sendWhatsAppMessage(to: string, body: OutboundRequest) {
  const payload = body.templateName ? templatePayload(to, body) : textPayload(to, body.text ?? "");

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

function templatePayload(to: string, body: OutboundRequest) {
  const parameters = (body.templateParameters ?? []).map((text) => ({
    type: "text",
    text,
  }));

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: body.templateName,
      language: {
        code: body.languageCode ?? DEFAULT_LANGUAGE_CODE,
      },
      ...(parameters.length
        ? {
          components: [
            {
              type: "body",
              parameters,
            },
          ],
        }
        : {}),
    },
  };
}

async function logAutomationEvent(
  supabase: SupabaseClient,
  request: OutboundRequest,
  recipient: Recipient,
  contact: ContactRecord,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string,
) {
  await supabase.from("whatsapp_automation_events").insert({
    event_type: request.sourceType ?? "manual_whatsapp_send",
    source_table: request.sourceType ?? null,
    source_id: request.sourceId ?? null,
    contact_id: contact.id,
    member_id: recipient.memberId,
    payload: {
      text: request.text,
      templateName: request.templateName,
      templateParameters: request.templateParameters,
    },
    status,
    error_message: errorMessage ?? null,
    processed_at: new Date().toISOString(),
  });
}

function normalizeToList(value?: string | string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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
