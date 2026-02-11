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
    const amount = Number(payload?.TransAmount ?? 0);
    const phone = payload?.MSISDN ? normalizeKenyanPhone(String(payload.MSISDN)) : null;

    await logCallbackAudit(supabase, {
      event_type: "c2b_confirmation",
      mpesa_receipt: receipt,
      result_code: 0,
      payload,
    });

    if (!receipt || !phone || !Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("mpesa_receipt", receipt)
      .maybeSingle();

    if (!existingPayment?.id) {
      await supabase.from("payments").insert({
        member_id: profile?.id ?? null,
        phone,
        amount,
        method: "till",
        checkout_request_id: null,
        merchant_request_id: null,
        mpesa_receipt: receipt,
        status: "awaiting_approval",
        verified_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mpesa-confirmation error", error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
