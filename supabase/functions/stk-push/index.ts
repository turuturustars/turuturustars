import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  createServiceClient,
  createStkPassword,
  createTimestamp,
  extractClientIp,
  fetchWithRetry,
  getMpesaAccessToken,
  getUserRoles,
  hasAnyRole,
  logCallbackAudit,
  normalizeKenyanPhone,
  parsePositiveAmount,
  requireAuthenticatedUser,
  requireEnv,
} from "../_shared/mpesa.ts";

type StkPushRequest = {
  phone: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
  member_id?: string;
};

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user, supabase } = await requireAuthenticatedUser(req);
    const body = await readJsonBody<StkPushRequest>(req);

    const phone = normalizeKenyanPhone(body.phone ?? "");
    const amount = parsePositiveAmount(body.amount);
    const accountReference = body.accountReference?.trim() || `CBO-${Date.now()}`;
    const transactionDesc = body.transactionDesc?.trim() || "CBO contribution payment";

    let memberId = user.id;
    if (body.member_id && body.member_id !== user.id) {
      const userRoles = await getUserRoles(supabase, user.id);
      const canPayForOthers = hasAnyRole(userRoles, ["admin", "treasurer"]);
      if (!canPayForOthers) {
        throw new HttpError(403, "You can only initiate STK payments for your own account");
      }
      memberId = body.member_id;
    }

    const baseUrl = requireEnv("MPESA_BASE_URL");
    const callbackUrl = requireEnv("MPESA_CALLBACK_URL");
    const shortCode = requireEnv("MPESA_SHORTCODE");
    const passkey = requireEnv("MPESA_PASSKEY");

    const timestamp = createTimestamp();
    const password = createStkPassword(shortCode, passkey, timestamp);
    const accessToken = await getMpesaAccessToken();

    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    const response = await fetchWithRetry(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      },
      3,
    );

    const mpesaResponse = await response.json().catch(() => ({}));

    const parsedResponseCode = Number(mpesaResponse.ResponseCode);
    await logCallbackAudit(supabase, {
      event_type: "stk_push_request",
      checkout_request_id: mpesaResponse.CheckoutRequestID ?? null,
      merchant_request_id: mpesaResponse.MerchantRequestID ?? null,
      result_code: Number.isFinite(parsedResponseCode) ? parsedResponseCode : null,
      payload: {
        request: stkPayload,
        response: mpesaResponse,
        response_status: response.status,
        initiated_by: user.id,
        client_ip: extractClientIp(req),
      },
    });

    if (!response.ok || mpesaResponse.ResponseCode !== "0") {
      throw new HttpError(
        502,
        mpesaResponse.ResponseDescription || mpesaResponse.errorMessage || "STK push request failed",
        mpesaResponse,
      );
    }

    const serviceSupabase = createServiceClient();
    const paymentInsert = {
      member_id: memberId,
      phone,
      amount,
      method: "stk",
      checkout_request_id: mpesaResponse.CheckoutRequestID,
      merchant_request_id: mpesaResponse.MerchantRequestID,
      status: "pending",
    };

    let paymentId: string | null = null;
    const { data: insertedPayment, error: insertError } = await serviceSupabase
      .from("payments")
      .insert(paymentInsert)
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingPayment, error: existingError } = await serviceSupabase
          .from("payments")
          .select("id")
          .eq("checkout_request_id", mpesaResponse.CheckoutRequestID)
          .maybeSingle();

        if (existingError) {
          throw new HttpError(500, "Failed to recover idempotent STK payment record", existingError);
        }

        paymentId = existingPayment?.id ?? null;
      } else {
        throw new HttpError(500, "Failed to store payment request", insertError);
      }
    } else {
      paymentId = insertedPayment?.id ?? null;
    }

    return jsonResponse({
      ok: true,
      payment_id: paymentId,
      checkout_request_id: mpesaResponse.CheckoutRequestID,
      merchant_request_id: mpesaResponse.MerchantRequestID,
      customer_message: mpesaResponse.CustomerMessage,
      response_description: mpesaResponse.ResponseDescription,
      status: "pending",
    });
  } catch (error) {
    console.error("stk-push failed", error);
    return errorResponse(error);
  }
});
