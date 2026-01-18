import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  action: "send" | "verify";
  phone: string;
  code?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: VerifyRequest = await req.json();
    const { action, phone, code } = body;

    if (!action || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: action and phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number to E.164 format for Kenya
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }
    formattedPhone = "+" + formattedPhone;

    console.log(`Processing ${action} request for phone: ${formattedPhone}`);

    const credentials = btoa(`${accountSid}:${authToken}`);

    if (action === "send") {
      // Send verification code
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Channel: "sms",
          }),
        }
      );

      const data = await response.json();
      console.log("Twilio send response:", JSON.stringify(data));

      if (response.ok && data.status === "pending") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Verification code sent successfully",
            status: data.status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.error("Twilio send error:", data);
        return new Response(
          JSON.stringify({
            success: false,
            error: data.message || "Failed to send verification code",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ success: false, error: "Verification code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the code
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Code: code,
          }),
        }
      );

      const data = await response.json();
      console.log("Twilio verify response:", JSON.stringify(data));

      if (response.ok && data.status === "approved") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Phone number verified successfully",
            status: data.status,
            valid: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: data.status === "pending" ? "Invalid verification code" : data.message || "Verification failed",
            valid: false,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action. Use 'send' or 'verify'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Twilio verify error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
