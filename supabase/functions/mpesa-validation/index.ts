import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    
    console.log("M-Pesa Validation request:", JSON.stringify(body, null, 2));
    
    const { TransID, TransAmount, MSISDN, BillRefNumber } = body;
    
    // Basic validation - you can add more complex logic here
    // For example, check if the member exists by phone number
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, status")
      .eq("phone", MSISDN)
      .single();
    
    // Accept all transactions for now, but log if member not found
    if (!profile) {
      console.log(`Payment from unknown number: ${MSISDN}`);
    }
    
    // Return success to accept the transaction
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Accepted",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    // Still accept to not block payments
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});
