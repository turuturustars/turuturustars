import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createServiceClient, logCallbackAudit, normalizeKenyanPhone, normalizeReceipt } from "../_shared/mpesa.ts";
import { notifyTreasurersOfMoneyEvent } from "../_shared/treasurer-whatsapp.ts";

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
      .select("id, full_name, phone, membership_number")
      .eq("phone", phone)
      .maybeSingle();

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("mpesa_receipt", receipt)
      .maybeSingle();

    if (!existingPayment?.id) {
      const { data: insertedPayment, error: insertError } = await supabase.from("payments").insert({
        member_id: profile?.id ?? null,
        phone,
        amount,
        method: "till",
        checkout_request_id: null,
        merchant_request_id: null,
        mpesa_receipt: receipt,
        status: "awaiting_approval",
        verified_at: null,
      }).select("id").maybeSingle();

      if (insertError) {
        console.error("mpesa-confirmation insert failed", insertError);
      } else {
        try {
          await notifyTreasurersOfMoneyEvent(supabase, {
            title: "C2B M-Pesa payment received",
            amount,
            status: "awaiting_approval",
            source: "mpesa-confirmation",
            memberId: profile?.id ?? null,
            memberName: profile?.full_name ?? null,
            memberPhone: phone,
            membershipNumber: profile?.membership_number ?? null,
            reference: receipt,
            transactionId: insertedPayment?.id ?? null,
            details: "Direct till/paybill confirmation",
          });
        } catch (treasurerAlertError) {
          console.error("mpesa-confirmation treasurer WhatsApp alert failed", treasurerAlertError);
        }
      }
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
