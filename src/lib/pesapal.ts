import { supabase } from "@/integrations/supabase/client";

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

export async function submitPesapalOrder(
  params: PesapalSubmitOrderParams
): Promise<PesapalSubmitOrderResponse> {
  const { data, error } = await supabase.functions.invoke("pesapal", {
    body: {
      action: "submit_order",
      ...params,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as PesapalSubmitOrderResponse;
}

export async function getPesapalTransactionStatus(orderTrackingId: string) {
  const { data, error } = await supabase.functions.invoke("pesapal", {
    body: {
      action: "get_status",
      orderTrackingId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function registerPesapalIpn(ipnUrl: string, ipnNotificationType = "POST") {
  const { data, error } = await supabase.functions.invoke("pesapal", {
    body: {
      action: "register_ipn",
      ipnUrl,
      ipnNotificationType,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
