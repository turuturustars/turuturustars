import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MPESA_CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY")!;
const MPESA_CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET")!;
const MPESA_PASSKEY = Deno.env.get("MPESA_PASSKEY")!;
const MPESA_SHORTCODE = Deno.env.get("MPESA_SHORTCODE")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use edge function secret to choose sandbox vs production endpoint.
const MPESA_BASE_URL = Deno.env.get("MPESA_BASE_URL") || "https://sandbox.safaricom.co.ke";

class HttpError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function normalizeKenyanPhone(rawValue: unknown): string {
  const raw = String(rawValue ?? "").trim();
  if (!raw) {
    throw new HttpError(400, "Missing phone number", { expected: "phoneNumber", received: rawValue as unknown });
  }

  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let normalized = digits;

  if (normalized.startsWith("0")) {
    normalized = `254${normalized.slice(1)}`;
  } else if (normalized.startsWith("7") || normalized.startsWith("1")) {
    normalized = `254${normalized}`;
  }

  if (!/^254[17]\d{8}$/.test(normalized)) {
    throw new HttpError(400, "Invalid phone number format", {
      expected: "2547XXXXXXXX or 2541XXXXXXXX",
      received: raw,
    });
  }

  return normalized;
}

function parseAmount(rawValue: unknown): number {
  const amount = Number(rawValue);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, "Invalid amount", {
      expected: "positive number",
      received: rawValue as unknown,
    });
  }
  return Math.round(amount);
}

async function ensureMemberCanTransact(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  hasFinancialRole: boolean,
) {
  if (hasFinancialRole) {
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Failed to validate member status", { detail: error.message });
  }

  if (!profile || profile.status !== "active") {
    throw new HttpError(403, "Your account is pending approval and currently read-only", {
      profile_status: profile?.status ?? null,
    });
  }
}

function assertMpesaConfig(): void {
  const missing: string[] = [];
  if (!MPESA_CONSUMER_KEY) missing.push("MPESA_CONSUMER_KEY");
  if (!MPESA_CONSUMER_SECRET) missing.push("MPESA_CONSUMER_SECRET");
  if (!MPESA_PASSKEY) missing.push("MPESA_PASSKEY");
  if (!MPESA_SHORTCODE) missing.push("MPESA_SHORTCODE");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new HttpError(500, "Missing required Edge Function secrets", { missing });
  }

  if (!/^\d{5,7}$/.test(MPESA_SHORTCODE)) {
    throw new HttpError(500, "Invalid MPESA_SHORTCODE secret", {
      expected: "numeric shortcode, e.g. 174379",
      receivedPreview: MPESA_SHORTCODE.slice(0, 8),
    });
  }
}

const getFunctionsBaseUrl = () => {
  const host = new URL(SUPABASE_URL).hostname;
  const ref = host.split(".")[0];
  return `https://${ref}.functions.supabase.co`;
};

// Log only that the function is initialized and which environment is targeted.
// NEVER log credentials (even partially) or full payment payloads.
const logInitialization = () => {
  const timestamp = new Date().toISOString();
  const env = MPESA_BASE_URL.includes("sandbox") ? "sandbox" : "production";
  const allSet = Boolean(
    MPESA_CONSUMER_KEY && MPESA_CONSUMER_SECRET && MPESA_SHORTCODE && MPESA_PASSKEY && MPESA_BASE_URL,
  );
  console.log(`[${timestamp}] mpesa: initialized env=${env} credentials_configured=${allSet}`);
};
logInitialization();

async function getAccessToken(): Promise<string> {
  assertMpesaConfig();
  const credentials = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] mpesa: requesting access token`);
  
  try {
    const response = await fetch(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    
    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch {
      throw new HttpError(502, "Invalid OAuth response from M-Pesa", {
        httpStatus: response.status,
      });
    }
    
    if (!response.ok || !data.access_token) {
      const errorTime = new Date().toISOString();
      const errorCode = typeof data.error === "string" ? data.error : undefined;
      const errorDesc = typeof data.error_description === "string" ? data.error_description : undefined;
      console.error(`[${errorTime}] mpesa: access token failed status=${response.status} code=${errorCode ?? "unknown"} desc=${errorDesc ?? "n/a"}`);
      throw new HttpError(502, `M-Pesa auth failed: ${errorDesc || errorCode || "Unknown error"}`, {
        httpStatus: response.status,
        mpesaErrorCode: errorCode,
        mpesaErrorDescription: errorDesc,
      });
    }
    
    console.log(`[${new Date().toISOString()}] mpesa: access token obtained`);
    return String(data.access_token);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.error(`[${new Date().toISOString()}] mpesa: access token error: ${msg}`);
    throw error;
  }
}

function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generatePassword(timestamp: string): string {
  const data = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return btoa(data);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    assertMpesaConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user and their role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has financial role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const hasFinancialRole = roles?.some(r => 
      ["admin", "treasurer", "chairperson"].includes(r.role)
    );

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch (jsonError) {
      throw new HttpError(400, "Invalid JSON request body", {
        parseError: jsonError instanceof Error ? jsonError.message : String(jsonError),
      });
    }

    const { action, ...params } = payload;
    if (typeof action !== "string" || !action.trim()) {
      throw new HttpError(400, "Missing action", {
        receivedKeys: Object.keys(payload || {}),
      });
    }

    console.log(`[${new Date().toISOString()}] Incoming M-Pesa request`, {
      action,
      keys: Object.keys(params),
    });

    // Some actions require financial roles (members are allowed to initiate STK pushes)
    const financialActions = ["register_urls", "generate_qr", "create_standing_order", "simulate_c2b"];
    if (financialActions.includes(action) && !hasFinancialRole) {
      throw new Error("Insufficient permissions for financial operations");
    }

    if (action === "stk_push" || action === "query_status") {
      await ensureMemberCanTransact(supabase, user.id, Boolean(hasFinancialRole));
    }

    const accessToken = await getAccessToken();
    let result;

    switch (action) {
      case "stk_push": {
        const {
          phoneNumber: rawPhone,
          amount: rawAmount,
          accountReference,
          transactionDesc,
          memberId: rawMemberId,
          contributionId,
        } = params;
        const memberId =
          typeof rawMemberId === "string" && rawMemberId.trim().length > 0
            ? rawMemberId.trim()
            : user.id;
        if (memberId !== user.id && !hasFinancialRole) {
          throw new HttpError(403, "You can only initiate payments for your own account");
        }
        const phoneNumber = normalizeKenyanPhone(rawPhone);
        const amount = parseAmount(rawAmount);
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        const requestTime = new Date().toISOString();
        
        console.log(`[${requestTime}] mpesa: stk_push initiated amount=${amount}`);
        const callbackUrl = `${getFunctionsBaseUrl()}/functions/v1/mpesa-callback`;
        
        const stkPayload = {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: phoneNumber,
          CallBackURL: callbackUrl,
          AccountReference: accountReference || "TuruturuStars",
          TransactionDesc: transactionDesc || "Contribution",
        };
        
        console.log(`[${requestTime}] mpesa: stk_push dispatching to safaricom`);
        
        const response = await fetch(
          `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(stkPayload),
          }
        );
        
        try {
          result = await response.json();
        } catch {
          throw new HttpError(502, "Invalid STK response from M-Pesa", {
            httpStatus: response.status,
          });
        }
        const responseTime = new Date().toISOString();
        
        console.log(`[${responseTime}] mpesa: stk_push response code=${result.ResponseCode}`);
        
        // Return Safaricom's actual error message instead of generic error
        if (!response.ok || result.errorCode) {
          const errorMsg = result.errorMessage || `M-Pesa Error: ${result.errorCode}`;
          console.error(`[${new Date().toISOString()}] mpesa: stk_push failed code=${result.errorCode}`);
          throw new HttpError(400, errorMsg, {
            httpStatus: response.status,
            mpesaErrorCode: result.errorCode,
            mpesaErrorMessage: result.errorMessage,
            mpesaResponseCode: result.ResponseCode,
            mpesaResponseDescription: result.ResponseDescription,
          });
        }
        
        if (result.ResponseCode !== "0") {
          const errorMsg = result.ResponseDescription || `Failed with code: ${result.ResponseCode}`;
          console.error(`[${new Date().toISOString()}] mpesa: stk_push response error code=${result.ResponseCode}`);
          throw new HttpError(400, errorMsg, {
            httpStatus: response.status,
            mpesaResponseCode: result.ResponseCode,
            mpesaResponseDescription: result.ResponseDescription,
          });
        }
        
        // Log the transaction

        await supabase.from("mpesa_transactions").insert({
          transaction_type: "stk_push",
          merchant_request_id: result.MerchantRequestID,
          checkout_request_id: result.CheckoutRequestID,
          amount: amount,
          phone_number: phoneNumber,
          member_id: memberId,
          contribution_id: contributionId,
          status: result.ResponseCode === "0" ? "pending" : "failed",
          initiated_by: user.id,
        });


        // Create audit log

        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_STK_PUSH",
          p_action_description: `Initiated STK push for KSh ${amount} to ${phoneNumber}`,
          p_entity_type: "mpesa_transaction",
          p_metadata: { amount, phoneNumber, checkoutRequestId: result.CheckoutRequestID },
        });

        
        break;
      }

      case "query_status": {
        const { checkoutRequestId } = params;
        if (typeof checkoutRequestId !== "string" || !checkoutRequestId.trim()) {
          throw new HttpError(400, "checkoutRequestId is required");
        }

        if (!hasFinancialRole) {
          const { data: transaction, error: transactionError } = await supabase
            .from("mpesa_transactions")
            .select("id, member_id")
            .eq("checkout_request_id", checkoutRequestId)
            .maybeSingle();

          if (transactionError) {
            throw new HttpError(500, "Failed to validate transaction ownership", {
              detail: transactionError.message,
            });
          }

          if (!transaction || transaction.member_id !== user.id) {
            throw new HttpError(403, "You do not have access to this transaction");
          }
        }

        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        const queryTime = new Date().toISOString();
        
        console.log(`[${queryTime}] mpesa: query_status start`);
        
        const response = await fetch(
          `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              BusinessShortCode: MPESA_SHORTCODE,
              Password: password,
              Timestamp: timestamp,
              CheckoutRequestID: checkoutRequestId,
            }),
          }
        );
        
        result = await response.json();
        const statusResponseTime = new Date().toISOString();
        
        console.log(`[${statusResponseTime}] mpesa: query_status response code=${result.ResultCode}`);
        
        // Update transaction status
        if (result.ResultCode !== undefined) {

          const updateTime = new Date().toISOString();
          const statusMap: Record<number | string, string> = {
            0: "completed",
            1: "incomplete",
            2: "failed",
            "1032": "request_timeout",
            "1037": "user_cancelled"
          };
          const newStatus = statusMap[result.ResultCode as number | string] || "unknown";
          
          await supabase
            .from("mpesa_transactions")
            .update({
              result_code: result.ResultCode,
              result_desc: result.ResultDesc,
              status: newStatus,
            })
            .eq("checkout_request_id", checkoutRequestId);
          
          console.log(`[${updateTime}] mpesa: transaction status=${newStatus}`);
        }
        
        break;
      }

      case "generate_qr": {
        const { amount, merchantName, refNumber } = params;
        const qrTime = new Date().toISOString();
        
        console.log(`[${qrTime}] mpesa: generate_qr start amount=${amount}`);
        
        const response = await fetch(
          `${MPESA_BASE_URL}/mpesa/qrcode/v1/generate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              MerchantName: merchantName || "Turuturu Stars CBO",
              RefNo: refNumber || "TSCBO",
              Amount: amount,
              TrxCode: "PB",
              CPI: MPESA_SHORTCODE,
              Size: "300",
            }),
          }
        );
        
        result = await response.json();
        const qrResponseTime = new Date().toISOString();
        
        console.log(`[${qrResponseTime}] mpesa: generate_qr response code=${result.ResponseCode}`);

        // Create audit log

        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_QR_GENERATED",
          p_action_description: `Generated QR code for KSh ${amount}`,
          p_entity_type: "mpesa_qr",
          p_metadata: { amount, refNumber, merchantName },
        });

        
        break;
      }

      case "register_urls": {
        const registerTime = new Date().toISOString();
        const validationUrl = `${SUPABASE_URL}/functions/v1/mpesa-validation`;
        const confirmationUrl = `${SUPABASE_URL}/functions/v1/mpesa-confirmation`;
        
        console.log(`[${registerTime}] mpesa: register_urls start`);
        
        const response = await fetch(
          `${MPESA_BASE_URL}/mpesa/c2b/v1/registerurl`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ShortCode: MPESA_SHORTCODE,
              ResponseType: "Completed",
              ConfirmationURL: confirmationUrl,
              ValidationURL: validationUrl,
            }),
          }
        );
        
        result = await response.json();
        const registerResponseTime = new Date().toISOString();
        
        console.log(`[${registerResponseTime}] mpesa: register_urls response code=${result.ResponseCode}`);

        // Create audit log

        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_URL_REGISTERED",
          p_action_description: "Registered M-Pesa callback URLs",
          p_entity_type: "mpesa_config",
          p_metadata: { validationUrl, confirmationUrl },
        });

        
        break;
      }

      case "simulate_c2b": {
        const { phoneNumber, amount, billRefNumber } = params;
        const simulateTime = new Date().toISOString();
        
        console.log(`[${simulateTime}] mpesa: simulate_c2b start amount=${amount}`);
        
        const response = await fetch(
          `${MPESA_BASE_URL}/mpesa/c2b/v1/simulate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ShortCode: MPESA_SHORTCODE,
              CommandID: "CustomerPayBillOnline",
              Amount: amount,
              Msisdn: phoneNumber,
              BillRefNumber: billRefNumber || "Test",
            }),
          }
        );
        
        result = await response.json();
        const simulateResponseTime = new Date().toISOString();
        
        console.log(`[${simulateResponseTime}] mpesa: simulate_c2b response code=${result.ResponseCode}`);
        
        break;
      }

      default:
        throw new HttpError(400, `Unknown action: ${action}`, {
          supportedActions: ["stk_push", "query_status", "generate_qr", "register_urls", "simulate_c2b"],
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorTime = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = error instanceof HttpError ? error.status : 400;
    const details = error instanceof HttpError ? error.details : undefined;
    
    console.error(`[${errorTime}] mpesa: request failed status=${statusCode} message=${errorMessage}`);
    
    // Return error with status 400 and detailed message
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        errorCode: "MPESA_REQUEST_FAILED",
        details,
        timestamp: errorTime,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
