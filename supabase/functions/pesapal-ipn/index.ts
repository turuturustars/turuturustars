import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Disable JWT verification because Pesapal webhooks/server calls won't include a Supabase session token.
export const config = {
  verify_jwt: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PESAPAL_CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY")!;
const PESAPAL_CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET")!;
const PESAPAL_BASE_URL = Deno.env.get("PESAPAL_BASE_URL") || "https://cybqa.pesapal.com/pesapalv3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.token) {
    const message = data?.error?.message || data?.message || "Pesapal auth failed";
    throw new Error(message);
  }

  return data.token as string;
}

function normalizeStatus(status?: string | null): string {
  const value = (status || "").toLowerCase();
  if (value.includes("completed")) return "completed";
  if (value.includes("failed")) return "failed";
  if (value.includes("reversed")) return "reversed";
  if (value.includes("invalid")) return "invalid";
  return "pending";
}

async function fetchTransactionStatus(accessToken: string, orderTrackingId: string) {
  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();
  if (!response.ok || data?.error) {
    const message = data?.error?.message || data?.message || "Failed to fetch transaction status";
    throw new Error(message);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const query = url.searchParams;

  let payload: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
  }

  const orderTrackingId =
    (payload["OrderTrackingId"] as string | undefined) ||
    (payload["orderTrackingId"] as string | undefined) ||
    query.get("OrderTrackingId") ||
    query.get("orderTrackingId");
  const merchantReference =
    (payload["OrderMerchantReference"] as string | undefined) ||
    (payload["orderMerchantReference"] as string | undefined) ||
    query.get("OrderMerchantReference") ||
    query.get("orderMerchantReference");
  const notificationType =
    (payload["OrderNotificationType"] as string | undefined) ||
    (payload["orderNotificationType"] as string | undefined) ||
    query.get("OrderNotificationType") ||
    query.get("orderNotificationType") ||
    (payload["pesapal_notification_type"] as string | undefined) ||
    query.get("pesapal_notification_type") ||
    "IPNCHANGE";

  try {
    await supabase.from("pesapal_ipn_events").insert({
      order_tracking_id: orderTrackingId ?? null,
      merchant_reference: merchantReference ?? null,
      notification_type: notificationType ?? null,
      raw_payload: payload,
    });
  } catch {
    // Do not block IPN acknowledgement on logging failure
  }

  if (!orderTrackingId) {
    return new Response(
      JSON.stringify({
        orderNotificationType: notificationType,
        orderTrackingId: "",
        orderMerchantReference: merchantReference ?? "",
        status: 400,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  try {
    const accessToken = await getAccessToken();
    const status = await fetchTransactionStatus(accessToken, orderTrackingId);
    const normalizedStatus = normalizeStatus(status.payment_status_description);

    const { data: transaction } = await supabase
      .from("pesapal_transactions")
      .select("id, contribution_id, donation_id")
      .eq("order_tracking_id", orderTrackingId)
      .maybeSingle();

    await supabase
      .from("pesapal_transactions")
      .update({
        status: normalizedStatus,
        payment_method: status.payment_method ?? null,
        confirmation_code: status.confirmation_code ?? null,
        payment_account: status.payment_account ?? null,
      })
      .eq("order_tracking_id", orderTrackingId);

    if (normalizedStatus === "completed") {
      if (transaction?.contribution_id) {
        await supabase
          .from("contributions")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            reference_number: status.confirmation_code ?? null,
          })
          .eq("id", transaction.contribution_id);
      }

      if (transaction?.donation_id) {
        await supabase
          .from("donations")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            reference_number: status.confirmation_code ?? null,
          })
          .eq("id", transaction.donation_id);
      }
    }

    return new Response(
      JSON.stringify({
        orderNotificationType: notificationType,
        orderTrackingId,
        orderMerchantReference: merchantReference ?? "",
        status: 200,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        orderNotificationType: notificationType,
        orderTrackingId,
        orderMerchantReference: merchantReference ?? "",
        status: 500,
        message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
