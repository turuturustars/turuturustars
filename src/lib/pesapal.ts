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

const PESA_ENDPOINT =
  (typeof window !== "undefined" ? window.location.origin : "") + "/pesapal";

async function callPesapal(body: Record<string, unknown>) {
  const resp = await fetch(PESA_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data?.error || data?.message || resp.statusText;
    throw new Error(message);
  }
  if (data?.error) {
    throw new Error(data.error);
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
