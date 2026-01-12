import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    
    console.log("M-Pesa Confirmation received:", JSON.stringify(body, null, 2));
    
    const {
      TransID,
      TransAmount,
      MSISDN,
      BillRefNumber,
      TransTime,
      FirstName,
      MiddleName,
      LastName,
    } = body;
    
    // Find member by phone number
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", MSISDN)
      .single();
    
    // Parse transaction time
    const transactionDate = new Date(
      parseInt(TransTime.substring(0, 4)),
      parseInt(TransTime.substring(4, 6)) - 1,
      parseInt(TransTime.substring(6, 8)),
      parseInt(TransTime.substring(8, 10)),
      parseInt(TransTime.substring(10, 12)),
      parseInt(TransTime.substring(12, 14))
    );
    
    // Record the C2B transaction
    await supabase.from("mpesa_transactions").insert({
      transaction_type: "c2b",
      mpesa_receipt_number: TransID,
      amount: parseFloat(TransAmount),
      phone_number: MSISDN,
      member_id: profile?.id,
      transaction_date: transactionDate.toISOString(),
      status: "completed",
      initiated_by: profile?.id || "00000000-0000-0000-0000-000000000000",
      metadata: {
        billRefNumber: BillRefNumber,
        firstName: FirstName,
        middleName: MiddleName,
        lastName: LastName,
      },
    });
    
    // Auto-create contribution if member found
    if (profile) {
      await supabase.from("contributions").insert({
        member_id: profile.id,
        amount: parseFloat(TransAmount),
        contribution_type: "welfare",
        status: "paid",
        paid_at: transactionDate.toISOString(),
        reference_number: TransID,
        notes: `Auto-recorded from M-Pesa C2B. Ref: ${BillRefNumber}`,
      });
      
      // Update contribution tracking
      await supabase
        .from("contribution_tracking")
        .update({
          last_contribution_date: transactionDate.toISOString(),
          consecutive_missed: 0,
        })
        .eq("member_id", profile.id);
    }
    
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Confirmation error:", error);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});
