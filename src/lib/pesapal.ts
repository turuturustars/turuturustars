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
  contributionId?: string;
  donationId?: string;
  memberId?: string;
  merchantReference?: string;
  notificationId?: string;
}

export interface PesapalSubmitOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
}

const DEFAULT_EDGE_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/functions/v1/pesapal`
    : "";

const PESA_ENDPOINT =
  (import.meta as any).env?.VITE_PESAPAL_ENDPOINT ||
  DEFAULT_EDGE_URL ||
  "https://mkcgkfzltohxagqvsbqk.functions.supabase.co/pesapal";

async function callPesapal(body: Record<string, unknown>) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (anon) headers["apikey"] = anon;

  const resp = await fetch(PESA_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!resp.ok || data?.error) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
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
  });
  return data as PesapalSubmitOrderResponse;
}

export async function getPesapalTransactionStatus(orderTrackingId: string) {
  return callPesapal({
    action: "get_status",
    orderTrackingId,
  });
}

export async function registerPesapalIpn(ipnUrl: string, ipnNotificationType = "POST") {
  return callPesapal({
    action: "register_ipn",
    ipnUrl,
    ipnNotificationType,
  });
}
