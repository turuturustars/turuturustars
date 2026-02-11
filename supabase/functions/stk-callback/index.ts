import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse } from "../_shared/http.ts";
import {
  createServiceClient,
  extractStkCallbackMetadata,
  logCallbackAudit,
  normalizeReceipt,
  verifyCallbackSignature,
} from "../_shared/mpesa.ts";

type StkCallbackPayload = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
};

function acceptedResponse() {
  return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createServiceClient();

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-mpesa-signature") ?? req.headers.get("x-signature");
    const signatureValid = await verifyCallbackSignature(rawBody, signatureHeader);

    let body: StkCallbackPayload;
    try {
      body = JSON.parse(rawBody) as StkCallbackPayload;
    } catch {
      throw new HttpError(400, "Invalid callback JSON payload");
    }

    const callback = body?.Body?.stkCallback;
    if (!callback) {
      await logCallbackAudit(supabase, {
        event_type: "stk_callback",
        signature_valid: signatureValid,
        payload: {
          error: "missing_stk_callback",
          body,
        },
      });
      return acceptedResponse();
    }

    const checkoutRequestId = callback.CheckoutRequestID ?? null;
    const merchantRequestId = callback.MerchantRequestID ?? null;
    const resultCode = Number(callback.ResultCode ?? 1);
    const resultDesc = callback.ResultDesc ?? null;

    const metadata = extractStkCallbackMetadata(callback.CallbackMetadata?.Item);
    const receipt = metadata.receipt ? normalizeReceipt(metadata.receipt) : null;

    await logCallbackAudit(supabase, {
      event_type: "stk_callback",
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      mpesa_receipt: receipt,
      result_code: Number.isFinite(resultCode) ? resultCode : null,
      signature_valid: signatureValid,
      payload: body,
    });

    if (!signatureValid) {
      return jsonResponse({ ResultCode: 1, ResultDesc: "Invalid callback signature" }, 401);
    }

    if (!checkoutRequestId) {
      return acceptedResponse();
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, status, mpesa_receipt")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (paymentError) {
      throw new HttpError(500, "Failed to query payment record", paymentError);
    }

    if (!payment?.id) {
      if (metadata.amount && metadata.phone) {
        const insertPayload = {
          member_id: null,
          phone: metadata.phone,
          amount: Number(metadata.amount),
          method: "stk",
          checkout_request_id: checkoutRequestId,
          merchant_request_id: merchantRequestId,
          mpesa_receipt: receipt,
          status: resultCode === 0 ? "completed" : "failed",
          verified_at: resultCode === 0 ? new Date().toISOString() : null,
        };

        const { error: orphanInsertError } = await supabase.from("payments").insert(insertPayload);
        if (orphanInsertError && orphanInsertError.code !== "23505") {
          throw new HttpError(500, "Failed to write orphan callback payment", orphanInsertError);
        }
      }

      return acceptedResponse();
    }

    if (payment.status === "completed" || payment.status === "failed") {
      return acceptedResponse();
    }

    if (resultCode === 0) {
      if (receipt) {
        const { data: duplicateReceipt, error: duplicateError } = await supabase
          .from("payments")
          .select("id")
          .eq("mpesa_receipt", receipt)
          .neq("id", payment.id)
          .maybeSingle();

        if (duplicateError) {
          throw new HttpError(500, "Failed duplicate receipt check", duplicateError);
        }

        if (duplicateReceipt?.id) {
          await supabase
            .from("payments")
            .update({ status: "failed" })
            .eq("id", payment.id)
            .neq("status", "completed");

          await logCallbackAudit(supabase, {
            event_type: "stk_callback",
            checkout_request_id: checkoutRequestId,
            merchant_request_id: merchantRequestId,
            mpesa_receipt: receipt,
            result_code: resultCode,
            payload: {
              warning: "duplicate_receipt_detected",
              duplicate_payment_id: duplicateReceipt.id,
              affected_payment_id: payment.id,
            },
          });

          return acceptedResponse();
        }
      }

      const updatePayload = {
        status: "completed",
        mpesa_receipt: receipt,
        verified_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("payments")
        .update(updatePayload)
        .eq("id", payment.id)
        .neq("status", "completed");

      if (updateError) {
        throw new HttpError(500, "Failed to mark payment as completed", updateError);
      }
    } else {
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .neq("status", "completed");

      if (updateError) {
        throw new HttpError(500, "Failed to mark payment as failed", {
          updateError,
          resultDesc,
        });
      }
    }

    return acceptedResponse();
  } catch (error) {
    console.error("stk-callback failed", error);

    // M-Pesa retries on non-200 responses; keep 200 for operational resilience
    // except explicit signature validation failures handled above.
    const failed = errorResponse(error);
    if (failed.status >= 500) {
      return acceptedResponse();
    }
    return failed;
  }
});
