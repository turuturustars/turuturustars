type SupabaseResult<T = unknown> = {
  data?: T;
  error?: unknown;
};

type SupabaseQuery<T = unknown> = PromiseLike<SupabaseResult<T>> & {
  select: (columns: string) => SupabaseQuery<T>;
  insert: (payload: Record<string, unknown>) => SupabaseQuery<T>;
  eq: (column: string, value: unknown) => SupabaseQuery<T>;
  in: (column: string, values: unknown[]) => SupabaseQuery<T>;
  not: (column: string, operator: string, value: unknown) => SupabaseQuery<T>;
  maybeSingle: () => Promise<SupabaseResult<T>>;
};

type SupabaseClient = {
  from: (table: string) => SupabaseQuery;
};

type TreasurerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export type TreasurerMoneyAlert = {
  title: string;
  amount?: number | null;
  status?: string | null;
  source: string;
  memberId?: string | null;
  memberName?: string | null;
  memberPhone?: string | null;
  membershipNumber?: string | null;
  reference?: string | null;
  checkoutRequestId?: string | null;
  transactionId?: string | null;
  details?: string | null;
};

export type TreasurerNotificationSummary = {
  sent: number;
  failed: number;
  skipped: number;
};

const DEFAULT_GRAPH_VERSION = "v21.0";

function formatKesAmount(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(Number(amount))) {
    return null;
  }

  return Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function normalizeWhatsAppPhone(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("254") && /^254[17]\d{8}$/.test(digits)) return digits;
  if (digits.startsWith("0") && /^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

function displayValue(value: string | null | undefined): string | null {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned : null;
}

async function maybeFetchMember(
  supabase: SupabaseClient,
  alert: TreasurerMoneyAlert,
): Promise<{ name: string | null; phone: string | null; membershipNumber: string | null }> {
  if (alert.memberName || alert.memberPhone || alert.membershipNumber || !alert.memberId) {
    return {
      name: displayValue(alert.memberName),
      phone: displayValue(alert.memberPhone),
      membershipNumber: displayValue(alert.membershipNumber),
    };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, membership_number")
      .eq("id", alert.memberId)
      .maybeSingle();

    if (error || !data || typeof data !== "object") {
      if (error) console.error("Failed to load member for treasurer WhatsApp alert:", error);
      return { name: null, phone: null, membershipNumber: null };
    }

    const row = data as Record<string, unknown>;
    return {
      name: displayValue(row.full_name as string | null),
      phone: displayValue(row.phone as string | null),
      membershipNumber: displayValue(row.membership_number as string | null),
    };
  } catch (error) {
    console.error("Failed to load member for treasurer WhatsApp alert:", error);
    return { name: null, phone: null, membershipNumber: null };
  }
}

function buildTreasurerMessage(alert: TreasurerMoneyAlert, member: {
  name: string | null;
  phone: string | null;
  membershipNumber: string | null;
}): string {
  const lines = [
    "Treasury alert",
    alert.title,
    alert.status ? `Status: ${alert.status}` : null,
    formatKesAmount(alert.amount) ? `Amount: KES ${formatKesAmount(alert.amount)}` : null,
    member.name || member.membershipNumber
      ? `Member: ${[member.name, member.membershipNumber].filter(Boolean).join(" - ")}`
      : null,
    member.phone ? `Phone: ${member.phone}` : null,
    alert.reference ? `Reference: ${alert.reference}` : null,
    alert.checkoutRequestId ? `Checkout: ${alert.checkoutRequestId}` : null,
    alert.details ? `Details: ${alert.details}` : null,
    `Source: ${alert.source}`,
  ].filter(Boolean) as string[];

  return lines.join("\n").slice(0, 3900);
}

async function fetchTreasurers(supabase: SupabaseClient): Promise<TreasurerProfile[]> {
  const rolesResult = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "treasurer");
  const roles = (rolesResult.data ?? []) as Array<{ user_id?: string }>;
  const rolesError = rolesResult.error;

  if (rolesError) {
    console.error("Failed to load treasurer roles for WhatsApp alert:", rolesError);
    return [];
  }

  const ids = Array.from(new Set((roles ?? []).map((role) => role.user_id).filter(Boolean))) as string[];
  if (!ids.length) return [];

  const profilesResult = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", ids)
    .not("phone", "is", null);
  const profiles = (profilesResult.data ?? []) as TreasurerProfile[];
  const profilesError = profilesResult.error;

  if (profilesError) {
    console.error("Failed to load treasurer profiles for WhatsApp alert:", profilesError);
    return [];
  }

  return (profiles ?? []).filter((profile) => normalizeWhatsAppPhone(profile.phone));
}

async function sendWhatsAppText(to: string, body: string): Promise<Record<string, unknown>> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();
  const graphVersion =
    Deno.env.get("WHATSAPP_GRAPH_API_VERSION")?.trim() ||
    Deno.env.get("WHATSAPP_GRAPH_VERSION")?.trim() ||
    DEFAULT_GRAPH_VERSION;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp credentials are not configured");
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = result?.error as Record<string, unknown> | undefined;
    throw new Error(String(error?.message || "WhatsApp treasurer alert failed"));
  }

  return result as Record<string, unknown>;
}

async function logTreasurerWhatsAppAlert(
  supabase: SupabaseClient,
  treasurer: TreasurerProfile,
  body: string,
  result: Record<string, unknown>,
  alert: TreasurerMoneyAlert,
): Promise<void> {
  const messages = Array.isArray(result.messages) ? result.messages as Array<Record<string, unknown>> : [];
  const providerMessageId = typeof messages[0]?.id === "string" ? messages[0].id : null;
  const phone = normalizeWhatsAppPhone(treasurer.phone);

  try {
    const { error } = await supabase.from("whatsapp_messages").insert({
      provider_message_id: providerMessageId,
      wa_message_id: providerMessageId,
      direction: "outbound",
      phone,
      profile_id: treasurer.id,
      member_id: treasurer.id,
      message_type: "text",
      body,
      text_body: body,
      status: providerMessageId ? "sent" : "failed",
      provider_response: result,
      payload: result,
      raw_payload: {
        source: alert.source,
        transaction_id: alert.transactionId ?? null,
        checkout_request_id: alert.checkoutRequestId ?? null,
        reference: alert.reference ?? null,
        alert_type: "treasurer_money_alert",
      },
    });

    if (error) {
      console.error("Failed to log treasurer WhatsApp alert:", error);
    }
  } catch (error) {
    console.error("Failed to log treasurer WhatsApp alert:", error);
  }
}

export async function notifyTreasurersOfMoneyEvent(
  supabase: SupabaseClient,
  alert: TreasurerMoneyAlert,
): Promise<TreasurerNotificationSummary> {
  const treasurers = await fetchTreasurers(supabase);
  if (!treasurers.length) {
    return { sent: 0, failed: 0, skipped: 1 };
  }

  const member = await maybeFetchMember(supabase, alert);
  const body = buildTreasurerMessage(alert, member);
  const summary: TreasurerNotificationSummary = { sent: 0, failed: 0, skipped: 0 };

  for (const treasurer of treasurers) {
    const phone = normalizeWhatsAppPhone(treasurer.phone);
    if (!phone) {
      summary.skipped += 1;
      continue;
    }

    try {
      const result = await sendWhatsAppText(phone, body);
      await logTreasurerWhatsAppAlert(supabase, treasurer, body, result, alert);
      summary.sent += 1;
    } catch (error) {
      console.error("Treasurer WhatsApp money alert failed:", error);
      summary.failed += 1;
    }
  }

  return summary;
}
