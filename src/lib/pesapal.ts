export interface PesapalBillingAddress {
  email_address: string;
  phone_number?: string;
  country_code?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  line_1?: string;
  line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  zip_code?: string;
}

export interface PesapalSubmitOrderParams {
  amount: number;
  currency?: string;
  description: string;
  callbackUrl: string;
  billingAddress: PesapalBillingAddress;
  donationId?: string;
  merchantReference?: string;
  notificationId?: string;
}

export interface PesapalSubmitOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
}

export interface PesapalStatusResponse extends Record<string, unknown> {
  payment_status_description?: string;
}

// Prefer an explicit endpoint; fall back to Supabase edge; last resort try local edge path.
const SUPABASE_EDGE = "https://mkcgkfzltohxagqvsbqk.functions.supabase.co/pesapal";
const LOCAL_EDGE =
  typeof window !== "undefined" ? `${window.location.origin}/functions/v1/pesapal` : "";

const PESA_ENDPOINT =
  import.meta.env.VITE_PESAPAL_ENDPOINT ||
  SUPABASE_EDGE ||
  LOCAL_EDGE;

const CLIENT_NOTIFICATION_ID = import.meta.env.VITE_PESAPAL_IPN_ID;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

async function callPesapal(body: Record<string, unknown>) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anon) headers["apikey"] = anon;

  const resp = await fetch(PESA_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let data: Record<string, unknown> = {};
  try {
    const parsed = text ? JSON.parse(text) : {};
    data = isRecord(parsed) ? parsed : { raw: parsed };
  } catch {
    data = { raw: text };
  }

  if (!resp.ok || data.error) {
    const nestedError = isRecord(data.error) ? data.error : null;
    const message =
      (typeof nestedError?.message === "string" ? nestedError.message : null) ||
      (typeof data.error === "string" ? data.error : null) ||
      (typeof data.message === "string" ? data.message : null) ||
      resp.statusText ||
      "Payment service unavailable";
    throw new Error(message);
  }
  return data;
}

export async function submitPesapalOrder(
  params: PesapalSubmitOrderParams
): Promise<PesapalSubmitOrderResponse> {
  const data = await callPesapal({
    action: "submit_order",
    ...params,
    notificationId: params.notificationId || CLIENT_NOTIFICATION_ID,
  });
  return data as unknown as PesapalSubmitOrderResponse;
}

export async function getPesapalTransactionStatus(orderTrackingId: string): Promise<PesapalStatusResponse> {
  return callPesapal({
    action: "get_status",
    orderTrackingId,
  }) as Promise<PesapalStatusResponse>;
}

export async function registerPesapalIpn(ipnUrl: string, ipnNotificationType = "POST") {
  return callPesapal({
    action: "register_ipn",
    ipnUrl,
    ipnNotificationType,
  });
}
