import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";

type VerifyAction = "send" | "verify";
type VerifyPurpose = "signup";

type SmsVerifyRequest = {
  action?: VerifyAction;
  purpose?: VerifyPurpose;
  phone?: string;
  code?: string;
};

type VerificationSessionRow = {
  id: string;
  code_hash: string;
  verify_attempts: number;
  max_verify_attempts: number;
  expires_at: string;
  resend_available_at: string;
};

const SMS_ENDPOINT = Deno.env.get("SMS_LEOPARD_SEND_URL")?.trim() || "https://api.smsleopard.com/v1/sms/send";
const DEFAULT_PURPOSE: VerifyPurpose = "signup";
const SUPPORTED_PURPOSES = new Set<VerifyPurpose>(["signup"]);

const DEFAULT_CODE_TTL_SECONDS = 10 * 60;
const DEFAULT_RESEND_SECONDS = 60;
const DEFAULT_MAX_VERIFY_ATTEMPTS = 5;
const DEFAULT_TOKEN_TTL_SECONDS = 30 * 60;
const DEFAULT_MAX_SENDS_PER_WINDOW = 4;
const DEFAULT_SEND_WINDOW_SECONDS = 60 * 60;
const CODE_LENGTH = 6;

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new HttpError(500, "Missing Supabase service credentials");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function resolvePurpose(rawPurpose: string | undefined): VerifyPurpose {
  const purpose = (rawPurpose || DEFAULT_PURPOSE) as VerifyPurpose;
  if (!SUPPORTED_PURPOSES.has(purpose)) {
    throw new HttpError(400, "Unsupported verification purpose");
  }
  return purpose;
}

function normalizeKenyanPhone(rawPhone: string | undefined): string {
  if (!rawPhone) {
    throw new HttpError(400, "Phone number is required");
  }

  const digits = rawPhone.trim().replace(/\D/g, "");
  if (/^0[17][0-9]{8}$/.test(digits)) {
    return `+254${digits.slice(1)}`;
  }
  if (/^254[17][0-9]{8}$/.test(digits)) {
    return `+${digits}`;
  }

  throw new HttpError(
    400,
    "Enter a valid Kenyan mobile number: 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +2547XXXXXXXX, or +2541XXXXXXXX.",
  );
}

function normalizeCode(rawCode: string | undefined): string {
  const code = (rawCode || "").replace(/\D/g, "");
  if (code.length !== CODE_LENGTH) {
    throw new HttpError(400, "Enter the 6-digit verification code.");
  }
  return code;
}

function maskPhone(phone: string): string {
  if (phone.length <= 8) return phone;
  return `${phone.slice(0, 7)}****${phone.slice(-2)}`;
}

function generateCode(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return random.toString().padStart(CODE_LENGTH, "0");
}

function resolveAccessToken(): string {
  const explicitToken = Deno.env.get("SMS_LEOPARD_ACCESS_TOKEN")?.trim();
  if (explicitToken) {
    return explicitToken;
  }

  const apiKey = Deno.env.get("SMS_LEOPARD_API_KEY")?.trim();
  const apiSecret = Deno.env.get("SMS_LEOPARD_API_SECRET")?.trim();
  if (!apiKey || !apiSecret) {
    throw new HttpError(500, "Missing SMSLeopard credentials");
  }

  return btoa(`${apiKey}:${apiSecret}`);
}

async function hashVerificationCode(phone: string, code: string): Promise<string> {
  const pepper = Deno.env.get("SMS_VERIFICATION_PEPPER")?.trim();
  if (!pepper) {
    throw new HttpError(500, "Missing SMS verification pepper secret");
  }

  const data = new TextEncoder().encode(`${phone}:${code}:${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendViaSmsLeopard(destinationPhone: string, message: string): Promise<unknown> {
  const accessToken = resolveAccessToken();
  const sourceId = Deno.env.get("SMS_LEOPARD_SOURCE_ID")?.trim();
  const destinationNumber = destinationPhone.startsWith("+")
    ? destinationPhone.slice(1)
    : destinationPhone;

  const payload: Record<string, unknown> = {
    destination: [{ number: destinationNumber }],
    message,
  };
  if (sourceId) {
    payload.source = sourceId;
  }

  console.log("Sending SMS via SMSLeopard to:", destinationNumber.replace(/\d/g, 'X').slice(-4));
  console.log("Payload:", JSON.stringify({ ...payload, destination: [{ number: '***' }] }));

  const response = await fetch(SMS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw;
  }

  console.log("SMSLeopard response status:", response.status);
  console.log("SMSLeopard response body:", JSON.stringify(parsed));

  const payloadObj = parsed as Record<string, unknown> | null;
  const providerMessage = typeof payloadObj?.message === "string" ? payloadObj.message : null;

  if (!response.ok) {
    console.error("SMS send failed with status", response.status);
    if (response.status >= 400 && response.status < 500 && providerMessage) {
      throw new HttpError(400, providerMessage, {
        status: response.status,
        response: parsed,
      });
    }

    throw new HttpError(502, providerMessage || "Failed to send verification SMS", {
      status: response.status,
      response: parsed,
    });
  }

  if (payloadObj?.success === false) {
    console.error("SMS provider returned success:false");
    throw new HttpError(400, providerMessage || "SMS provider rejected verification message", payloadObj);
  }

  console.log("SMS sent successfully");
  return parsed;
}

async function ensurePhoneNotRegistered(supabase: ReturnType<typeof createServiceClient>, phone: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Failed to verify phone uniqueness", error);
  }

  if (data?.id) {
    throw new HttpError(409, "This phone number is already linked to an existing account.");
  }
}

async function handleSendCode(
  supabase: ReturnType<typeof createServiceClient>,
  purpose: VerifyPurpose,
  phone: string,
) {
  await ensurePhoneNotRegistered(supabase, phone);

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const resendSeconds = parsePositiveInt(
    Deno.env.get("SMS_VERIFICATION_RESEND_SECONDS"),
    DEFAULT_RESEND_SECONDS,
  );
  const codeTtlSeconds = parsePositiveInt(
    Deno.env.get("SMS_VERIFICATION_CODE_TTL_SECONDS"),
    DEFAULT_CODE_TTL_SECONDS,
  );
  const maxVerifyAttempts = parsePositiveInt(
    Deno.env.get("SMS_VERIFICATION_MAX_VERIFY_ATTEMPTS"),
    DEFAULT_MAX_VERIFY_ATTEMPTS,
  );
  const maxSendsPerWindow = parsePositiveInt(
    Deno.env.get("SMS_VERIFICATION_MAX_SENDS_PER_WINDOW"),
    DEFAULT_MAX_SENDS_PER_WINDOW,
  );
  const sendWindowSeconds = parsePositiveInt(
    Deno.env.get("SMS_VERIFICATION_SEND_WINDOW_SECONDS"),
    DEFAULT_SEND_WINDOW_SECONDS,
  );

  const { data: latestRows, error: latestError } = await supabase
    .from("sms_verification_sessions")
    .select("id, resend_available_at")
    .eq("purpose", purpose)
    .eq("phone", phone)
    .is("verified_at", null)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (latestError) {
    throw new HttpError(500, "Failed to read verification sessions", latestError);
  }

  const latest = (latestRows?.[0] as { id: string; resend_available_at: string } | undefined) ?? null;
  if (latest) {
    const resendAt = new Date(latest.resend_available_at).getTime();
    if (Number.isFinite(resendAt) && resendAt > now) {
      const waitSeconds = Math.max(1, Math.ceil((resendAt - now) / 1000));
      throw new HttpError(429, `Please wait ${waitSeconds}s before requesting another code.`, {
        resendAfterSeconds: waitSeconds,
      });
    }
  }

  const cutoffIso = new Date(now - sendWindowSeconds * 1000).toISOString();
  const { data: recentRows, error: recentError } = await supabase
    .from("sms_verification_sessions")
    .select("id")
    .eq("purpose", purpose)
    .eq("phone", phone)
    .gte("created_at", cutoffIso)
    .limit(maxSendsPerWindow + 1);

  if (recentError) {
    throw new HttpError(500, "Failed to enforce SMS send rate limits", recentError);
  }

  if ((recentRows?.length || 0) >= maxSendsPerWindow) {
    throw new HttpError(429, "Too many verification requests. Please try again later.", {
      retryAfterSeconds: sendWindowSeconds,
    });
  }

  const code = generateCode();
  const codeHash = await hashVerificationCode(phone, code);
  const expiresAtIso = new Date(now + codeTtlSeconds * 1000).toISOString();
  const resendAtIso = new Date(now + resendSeconds * 1000).toISOString();

  console.log("Generated verification code for phone:", phone.slice(-4), "Code:", code);

  const { error: invalidateError } = await supabase
    .from("sms_verification_sessions")
    .update({
      consumed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("purpose", purpose)
    .eq("phone", phone)
    .is("verified_at", null)
    .is("consumed_at", null);

  if (invalidateError) {
    throw new HttpError(500, "Failed to rotate old verification sessions", invalidateError);
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("sms_verification_sessions")
    .insert({
      purpose,
      phone,
      code_hash: codeHash,
      expires_at: expiresAtIso,
      resend_available_at: resendAtIso,
      max_verify_attempts: maxVerifyAttempts,
      sends_count: 1,
      verify_attempts: 0,
      last_sent_at: nowIso,
    })
    .select("id")
    .limit(1);

  if (insertError) {
    throw new HttpError(500, "Failed to create verification session", insertError);
  }

  const sessionId = insertedRows?.[0]?.id;
  if (!sessionId) {
    throw new HttpError(500, "Verification session could not be created");
  }

  console.log("Created verification session:", sessionId);

  const expiresMinutes = Math.max(1, Math.ceil(codeTtlSeconds / 60));
  const message =
    `Your Turuturu Stars verification code is ${code}. ` +
    `It expires in ${expiresMinutes} minute${expiresMinutes === 1 ? "" : "s"}. Do not share this code.`;

  console.log("Sending SMS message:", message);

  try {
    await sendViaSmsLeopard(phone, message);
  } catch (error) {
    console.error("SMS sending failed, marking session as consumed:", error);
    await supabase
      .from("sms_verification_sessions")
      .update({
        consumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    throw error;
  }

  console.log("SMS send completed successfully for session:", sessionId);

  return jsonResponse({
    success: true,
    message: "Verification code sent successfully.",
    purpose,
    phone,
    maskedPhone: maskPhone(phone),
    expiresInSeconds: codeTtlSeconds,
    resendAfterSeconds: resendSeconds,
  });
}

async function handleVerifyCode(
  supabase: ReturnType<typeof createServiceClient>,
  purpose: VerifyPurpose,
  phone: string,
  code: string,
) {
  await ensurePhoneNotRegistered(supabase, phone);

  const tokenTtlSeconds = parsePositiveInt(
    Deno.env.get("SMS_VERIFICATION_TOKEN_TTL_SECONDS"),
    DEFAULT_TOKEN_TTL_SECONDS,
  );
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data: sessionRows, error: sessionError } = await supabase
    .from("sms_verification_sessions")
    .select("id, code_hash, verify_attempts, max_verify_attempts, expires_at, resend_available_at")
    .eq("purpose", purpose)
    .eq("phone", phone)
    .is("verified_at", null)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (sessionError) {
    throw new HttpError(500, "Failed to read verification session", sessionError);
  }

  const session = (sessionRows?.[0] as VerificationSessionRow | undefined) ?? null;
  if (!session) {
    throw new HttpError(400, "No active verification request found. Send a new code first.");
  }

  const expiresAt = new Date(session.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    await supabase
      .from("sms_verification_sessions")
      .update({
        consumed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", session.id);
    throw new HttpError(400, "Verification code expired. Request a new code.");
  }

  if (session.verify_attempts >= session.max_verify_attempts) {
    await supabase
      .from("sms_verification_sessions")
      .update({
        consumed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", session.id);
    throw new HttpError(429, "Too many verification attempts. Request a new code.");
  }

  const providedHash = await hashVerificationCode(phone, code);
  if (providedHash !== session.code_hash) {
    const nextAttempts = session.verify_attempts + 1;
    const terminal = nextAttempts >= session.max_verify_attempts;
    await supabase
      .from("sms_verification_sessions")
      .update({
        verify_attempts: nextAttempts,
        consumed_at: terminal ? nowIso : null,
        updated_at: nowIso,
      })
      .eq("id", session.id);

    if (terminal) {
      throw new HttpError(429, "Too many incorrect attempts. Request a new code.");
    }

    const attemptsLeft = session.max_verify_attempts - nextAttempts;
    throw new HttpError(
      400,
      `Invalid verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`,
    );
  }

  const verificationToken = crypto.randomUUID();
  const tokenExpiresAtIso = new Date(now + tokenTtlSeconds * 1000).toISOString();
  const { error: updateError } = await supabase
    .from("sms_verification_sessions")
    .update({
      verified_at: nowIso,
      verification_token: verificationToken,
      token_expires_at: tokenExpiresAtIso,
      updated_at: nowIso,
    })
    .eq("id", session.id);

  if (updateError) {
    throw new HttpError(500, "Failed to finalize phone verification", updateError);
  }

  return jsonResponse({
    success: true,
    message: "Phone verified successfully.",
    purpose,
    phone,
    verificationToken,
    expiresInSeconds: tokenTtlSeconds,
  });
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await readJsonBody<SmsVerifyRequest>(req);
    console.log("sms-verify request body:", { action: body.action, purpose: body.purpose, phone: body.phone ? "***" : "missing", code: body.code ? "***" : "missing" });
    
    const action = body.action;
    if (!action || (action !== "send" && action !== "verify")) {
      console.error("Invalid action:", action);
      throw new HttpError(400, "Invalid action. Use 'send' or 'verify'.");
    }

    console.log("Validating purpose:", body.purpose);
    const purpose = resolvePurpose(body.purpose);
    
    console.log("Normalizing phone:", body.phone ? "***" : "missing");
    const phone = normalizeKenyanPhone(body.phone);
    
    const supabase = createServiceClient();

    if (action === "send") {
      return await handleSendCode(supabase, purpose, phone);
    }

    const code = normalizeCode(body.code);
    return await handleVerifyCode(supabase, purpose, phone, code);
  } catch (error) {
    console.error("sms-verify failed", error);
    return errorResponse(error);
  }
});
