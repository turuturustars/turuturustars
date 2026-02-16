import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEFAULT_ALLOWED_ORIGIN = "https://turuturustars.co.ke";

const pickOrigin = (origin: string | null) => {
  if (!origin) return DEFAULT_ALLOWED_ORIGIN;

  if (
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin === DEFAULT_ALLOWED_ORIGIN
  ) {
    return origin;
  }

  return DEFAULT_ALLOWED_ORIGIN;
};

const corsHeaders = (origin: string | null) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": pickOrigin(origin),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-twilio-verify-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface VerifyRequest {
  action: "send" | "verify";
  phone: string;
  code?: string;
}

function normalizeKenyanPhone(rawPhone: string): string {
  const digits = rawPhone.trim().replace(/\D/g, "");
  if (/^0[17][0-9]{8}$/.test(digits)) {
    return `+254${digits.slice(1)}`;
  }
  if (/^254[17][0-9]{8}$/.test(digits)) {
    return `+${digits}`;
  }
  throw new Error("Invalid Kenyan phone number.");
}

function maskPhone(phone: string): string {
  if (phone.length <= 8) return phone;
  return `${phone.slice(0, 7)}****${phone.slice(-2)}`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: corsHeaders(origin) },
    );
  }

  try {
    const expectedSecret = Deno.env.get("TWILIO_VERIFY_SECRET")?.trim() || "";
    if (!expectedSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "TWILIO_VERIFY_SECRET is not configured" }),
        { status: 503, headers: corsHeaders(origin) },
      );
    }

    const providedSecret = req.headers.get("x-twilio-verify-secret")?.trim() || "";
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

    if (providedSecret !== expectedSecret && bearer !== expectedSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: corsHeaders(origin) },
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!accountSid || !authToken || !verifyServiceSid) {
      return new Response(
        JSON.stringify({ success: false, error: "Twilio credentials not configured" }),
        { status: 500, headers: corsHeaders(origin) },
      );
    }

    let body: VerifyRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    const { action, phone, code } = body;

    if (!action || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: action and phone" }),
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    if (action !== "send" && action !== "verify") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action. Use 'send' or 'verify'" }),
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    const formattedPhone = normalizeKenyanPhone(phone);
    console.log(`twilio-verify ${action} request for ${maskPhone(formattedPhone)}`);

    const credentials = btoa(`${accountSid}:${authToken}`);

    if (action === "send") {
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

      if (response.ok && data.status === "pending") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Verification code sent successfully",
            status: data.status,
          }),
          { status: 200, headers: corsHeaders(origin) },
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: data.message || "Failed to send verification code",
          }),
          { status: 400, headers: corsHeaders(origin) },
        );
      }
    }

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: "Verification code is required" }),
        { status: 400, headers: corsHeaders(origin) },
      );
    }

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
      },
    );

    const data = await response.json();

    if (response.ok && data.status === "approved") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Phone number verified successfully",
          status: data.status,
          valid: true,
        }),
        { status: 200, headers: corsHeaders(origin) },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: data.status === "pending" ? "Invalid verification code" : data.message || "Verification failed",
        valid: false,
      }),
      { status: 400, headers: corsHeaders(origin) },
    );
  } catch (error) {
    console.error("Twilio verify error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: corsHeaders(origin) },
    );
  }
});
