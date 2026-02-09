import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Allow public access; we handle auth inside as needed
export const config = {
  verify_jwt: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const PESAPAL_CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY")!;
const PESAPAL_CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET")!;
const PESAPAL_BASE_URL = Deno.env.get("PESAPAL_BASE_URL") || "https://cybqa.pesapal.com/pesapalv3";
const PESAPAL_IPN_ID = Deno.env.get("PESAPAL_IPN_ID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type PesapalBillingAddress = {
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
};

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
  if (!response.ok) {
    const message = data?.error?.message || data?.message || "Failed to fetch transaction status";
    throw new Error(message);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action, ...params } = body ?? {};

    if (!action) {
      throw new Error("Missing action");
    }

    if (action === "register_ipn") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) throw new Error("Unauthorized");

      const token = authHeader.replace("Bearer ", "");
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user) throw new Error("Unauthorized");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id);

      const hasFinancialRole = roles?.some((r) =>
        ["admin", "treasurer", "chairperson"].includes(r.role)
      );
      if (!hasFinancialRole) throw new Error("Insufficient permissions");

      const ipnUrl = params.ipnUrl;
      const ipnNotificationType = params.ipnNotificationType || "POST";
      if (!ipnUrl) throw new Error("Missing IPN URL");

      const accessToken = await getAccessToken();
      const response = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url: ipnUrl,
          ipn_notification_type: ipnNotificationType,
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.error) {
        const message = result?.error?.message || result?.message || "IPN registration failed";
        throw new Error(message);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit_order") {
      const authHeader = req.headers.get("authorization");
      let userId: string | null = null;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: authData } = await supabase.auth.getUser(token);
        userId = authData?.user?.id ?? null;
      }

      const amount = Number(params.amount);
      const currency = params.currency || "KES";
      const description = params.description || "Payment";
      const callbackUrl = params.callbackUrl;
      const redirectMode = params.redirectMode ?? "";
      const branch = params.branch ?? "";
      const donationId = params.donationId ?? null;
      const contributionId = params.contributionId ?? null;

      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }
      if (!callbackUrl) throw new Error("Missing callback URL");

      let memberId = params.memberId ?? null;
      if (contributionId) {
        const { data: contribution, error } = await supabase
          .from("contributions")
          .select("member_id")
          .eq("id", contributionId)
          .maybeSingle();
        if (error || !contribution?.member_id) {
          throw new Error("Contribution not found");
        }
        memberId = contribution.member_id;
      }

      if (params.memberId && userId && params.memberId !== userId) {
        throw new Error("Unauthorized member");
      }

      const merchantReference =
        params.merchantReference ||
        (contributionId
          ? `C-${contributionId}`
          : donationId
            ? `D-${donationId}`
            : `TS-${crypto.randomUUID()}`);

      const notificationId = PESAPAL_IPN_ID || params.notificationId;
      if (!notificationId) {
        throw new Error("Missing notification ID. Register IPN first.");
      }

      const billingAddress: PesapalBillingAddress = params.billingAddress;
      if (!billingAddress?.email_address) {
        throw new Error("Billing email is required");
      }

      const accessToken = await getAccessToken();
      const payload = {
        id: merchantReference,
        currency,
        amount,
        description,
        callback_url: callbackUrl,
        redirect_mode: redirectMode,
        notification_id: notificationId,
        branch,
        billing_address: billingAddress,
      };

      const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || result?.error) {
        const message = result?.error?.message || result?.message || "Order submission failed";
        throw new Error(message);
      }

      await supabase.from("pesapal_transactions").insert({
        order_tracking_id: result.order_tracking_id,
        merchant_reference: result.merchant_reference || merchantReference,
        amount,
        currency,
        description,
        status: "pending",
        member_id: memberId,
        contribution_id: contributionId,
        donation_id: donationId,
        initiated_by: userId,
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_status") {
      const orderTrackingId = params.orderTrackingId;
      if (!orderTrackingId) throw new Error("Missing order tracking ID");

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

      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}, {
  verifyJWT: false,
});
