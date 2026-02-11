import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createServiceClient, logCallbackAudit, normalizeKenyanPhone, normalizeReceipt } from "../_shared/mpesa.ts";

serve(async (req) => {
  const supabase = createServiceClient();

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const receipt = payload?.TransID ? normalizeReceipt(String(payload.TransID)) : null;
    const phone = payload?.MSISDN ? normalizeKenyanPhone(String(payload.MSISDN)) : null;

    await logCallbackAudit(supabase, {
      event_type: "c2b_validation",
      mpesa_receipt: receipt,
      result_code: 0,
      payload: {
        ...payload,
        normalized_phone: phone,
      },
    });

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mpesa-validation error", error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
