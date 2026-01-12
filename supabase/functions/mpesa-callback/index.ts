import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    
    console.log("M-Pesa Callback received:", JSON.stringify(body, null, 2));
    
    const { Body } = body;
    const { stkCallback } = Body;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    
    // Extract callback metadata
    let mpesaReceiptNumber = "";
    let amount = 0;
    let phoneNumber = "";
    let transactionDate = null;
    
    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case "MpesaReceiptNumber":
            mpesaReceiptNumber = item.Value;
            break;
          case "Amount":
            amount = item.Value;
            break;
          case "PhoneNumber":
            phoneNumber = String(item.Value);
            break;
          case "TransactionDate":
            const dateStr = String(item.Value);
            transactionDate = new Date(
              parseInt(dateStr.substring(0, 4)),
              parseInt(dateStr.substring(4, 6)) - 1,
              parseInt(dateStr.substring(6, 8)),
              parseInt(dateStr.substring(8, 10)),
              parseInt(dateStr.substring(10, 12)),
              parseInt(dateStr.substring(12, 14))
            );
            break;
        }
      }
    }
    
    // Update the transaction record
    const { data: transaction, error: updateError } = await supabase
      .from("mpesa_transactions")
      .update({
        result_code: ResultCode,
        result_desc: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        phone_number: phoneNumber || undefined,
        transaction_date: transactionDate,
        status: ResultCode === 0 ? "completed" : "failed",
      })
      .eq("checkout_request_id", CheckoutRequestID)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating transaction:", updateError);
    }
    
    // If payment successful, update contribution status
    if (ResultCode === 0 && transaction?.contribution_id) {
      await supabase
        .from("contributions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          reference_number: mpesaReceiptNumber,
        })
        .eq("id", transaction.contribution_id);
        
      // Update contribution tracking
      if (transaction.member_id) {
        await supabase
          .from("contribution_tracking")
          .update({
            last_contribution_date: new Date().toISOString(),
            consecutive_missed: 0,
          })
          .eq("member_id", transaction.member_id);
      }
    }
    
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: message }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});
