import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { HttpError } from "./http.ts";

type TokenCache = {
  token: string;
  expiresAt: number;
};

type CallbackAuditPayload = {
  event_type: string;
  checkout_request_id?: string | null;
  merchant_request_id?: string | null;
  mpesa_receipt?: string | null;
  result_code?: number | null;
  signature_valid?: boolean;
  payload?: unknown;
};

const encoder = new TextEncoder();
let mpesaTokenCache: TokenCache | null = null;

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | null {
  return Deno.env.get(name) ?? null;
}

export function createServiceClient() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireAuthenticatedUser(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    throw new HttpError(401, "Missing bearer token");
  }

  const supabase = createServiceClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new HttpError(401, "Invalid or expired token");
  }

  return { user, supabase };
}

export async function getUserRoles(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw new HttpError(500, "Failed to load user roles", error);
  }

  return (data ?? []).map((row) => row.role as string);
}

export function hasAnyRole(userRoles: string[], roles: string[]): boolean {
  return userRoles.some((role) => roles.includes(role));
}

export function normalizeKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let normalized = cleaned;

  if (normalized.startsWith("0")) {
    normalized = `254${normalized.slice(1)}`;
  }

  if (normalized.startsWith("7") || normalized.startsWith("1")) {
    normalized = `254${normalized}`;
  }

  if (!/^254[17]\d{8}$/.test(normalized)) {
    throw new HttpError(
      400,
      "Invalid Kenyan phone number. Use format 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, or 2541XXXXXXXX.",
    );
  }

  return normalized;
}

export function normalizeReceipt(receipt: string): string {
  const value = receipt.trim().toUpperCase().replace(/\s+/g, "");
  if (!value) {
    throw new HttpError(400, "M-Pesa receipt is required");
  }
  return value;
}

export function createTimestamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function createStkPassword(shortCode: string, passkey: string, timestamp: string): string {
  return btoa(`${shortCode}${passkey}${timestamp}`);
}

export async function getMpesaAccessToken(): Promise<string> {
  if (mpesaTokenCache && Date.now() < mpesaTokenCache.expiresAt - 30_000) {
    return mpesaTokenCache.token;
  }

  const consumerKey = requireEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = requireEnv("MPESA_CONSUMER_SECRET");
  const baseUrl = requireEnv("MPESA_BASE_URL");
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);

  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  const payload = await safeJson(response);

  if (!response.ok || !payload.access_token) {
    throw new HttpError(502, "Failed to get M-Pesa OAuth token", payload);
  }

  const expiresIn = Number(payload.expires_in ?? 3599);
  mpesaTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return payload.access_token;
}

export async function fetchWithRetry(url: string, init: RequestInit, attempts = 3, baseDelayMs = 400): Promise<Response> {
  let lastError: unknown = null;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, init);
      if (response.status < 500 || i === attempts - 1) {
        return response;
      }
      lastError = new Error(`Upstream returned ${response.status}`);
    } catch (error) {
      lastError = error;
      if (i === attempts - 1) {
        break;
      }
    }

    const delay = baseDelayMs * 2 ** i;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new HttpError(502, "Failed to reach M-Pesa API after retries", lastError ?? undefined);
}

export async function safeJson(response: Response): Promise<Record<string, any>> {
  const raw = await response.text();
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return { raw };
  }
}

export function parseDarajaTimestamp(value: string | number | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const digits = String(value).trim();
  if (!/^\d{14}$/.test(digits)) {
    return null;
  }

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  const hour = Number(digits.slice(8, 10));
  const minute = Number(digits.slice(10, 12));
  const second = Number(digits.slice(12, 14));

  const date = new Date(Date.UTC(year, month, day, hour, minute, second));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function extractStkCallbackMetadata(items: Array<{ Name: string; Value?: string | number }> | undefined) {
  const output: {
    amount: number | null;
    receipt: string | null;
    phone: string | null;
    transactionDate: string | null;
  } = {
    amount: null,
    receipt: null,
    phone: null,
    transactionDate: null,
  };

  if (!items) {
    return output;
  }

  for (const item of items) {
    if (item.Name === "Amount" && item.Value != null) {
      output.amount = Number(item.Value);
    }
    if (item.Name === "MpesaReceiptNumber" && item.Value != null) {
      output.receipt = normalizeReceipt(String(item.Value));
    }
    if (item.Name === "PhoneNumber" && item.Value != null) {
      output.phone = normalizeKenyanPhone(String(item.Value));
    }
    if (item.Name === "TransactionDate" && item.Value != null) {
      output.transactionDate = parseDarajaTimestamp(item.Value);
    }
  }

  return output;
}

export async function logCallbackAudit(supabase: ReturnType<typeof createServiceClient>, payload: CallbackAuditPayload): Promise<void> {
  const { error } = await supabase.from("mpesa_callback_audit").insert({
    event_type: payload.event_type,
    checkout_request_id: payload.checkout_request_id ?? null,
    merchant_request_id: payload.merchant_request_id ?? null,
    mpesa_receipt: payload.mpesa_receipt ?? null,
    result_code: payload.result_code ?? null,
    signature_valid: payload.signature_valid ?? true,
    payload: payload.payload ?? {},
  });

  if (error) {
    console.error("Failed to write callback audit", error);
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyCallbackSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = optionalEnv("MPESA_CALLBACK_SIGNATURE_SECRET");
  if (!secret) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const sanitizedHeader = signatureHeader.trim().replace(/^sha256=/i, "");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const signatureBytes = new Uint8Array(signatureBuffer);
  const expectedHex = bytesToHex(signatureBytes);
  const expectedBase64 = bytesToBase64(signatureBytes);

  return constantTimeCompare(sanitizedHeader, expectedHex) || constantTimeCompare(sanitizedHeader, expectedBase64);
}

export async function validateTreasurerAccess(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<void> {
  const roles = await getUserRoles(supabase, userId);
  if (!hasAnyRole(roles, ["admin", "treasurer"])) {
    throw new HttpError(403, "Only treasurer/admin users can perform this action");
  }
}

export async function validateFinanceAccess(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<void> {
  const roles = await getUserRoles(supabase, userId);
  if (!hasAnyRole(roles, ["admin", "treasurer"])) {
    throw new HttpError(403, "Only admin/treasurer users can perform this action");
  }
}

export async function ensureMemberCanInteract(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  preloadedRoles?: string[],
): Promise<void> {
  const roles = preloadedRoles ?? await getUserRoles(supabase, userId);
  if (hasAnyRole(roles, ["admin", "treasurer", "chairperson"])) {
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Unable to validate account status", error);
  }

  if (!profile?.status || profile.status !== "active") {
    throw new HttpError(
      403,
      "Your account is in read-only mode until approval. Contact admin if this persists.",
      { status: profile?.status ?? null },
    );
  }
}

export function parsePositiveAmount(amount: unknown): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, "Amount must be a positive number");
  }
  return Number(value.toFixed(2));
}

export function extractClientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
