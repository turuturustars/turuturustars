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

// Use sandbox for testing, production for live
const MPESA_BASE_URL = "https://sandbox.safaricom.co.ke";

// Log loaded credentials (without exposing full secrets)
console.log("M-Pesa Credentials Loaded:");
console.log("- MPESA_CONSUMER_KEY:", MPESA_CONSUMER_KEY ? `${MPESA_CONSUMER_KEY.substring(0, 10)}...` : "NOT SET");
console.log("- MPESA_CONSUMER_SECRET:", MPESA_CONSUMER_SECRET ? `${MPESA_CONSUMER_SECRET.substring(0, 10)}...` : "NOT SET");
console.log("- MPESA_SHORTCODE:", MPESA_SHORTCODE || "NOT SET");
console.log("- MPESA_PASSKEY:", MPESA_PASSKEY ? `${MPESA_PASSKEY.substring(0, 10)}...` : "NOT SET");
console.log("- MPESA_BASE_URL:", MPESA_BASE_URL);

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  
  console.log("Fetching M-Pesa access token...");
  console.log("- Using Consumer Key:", MPESA_CONSUMER_KEY.substring(0, 15) + "...");
  console.log("- Credentials base64:", credentials.substring(0, 20) + "...");
  
  const response = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );
  
  const data = await response.json();
  
  if (!data.access_token) {
    console.error("Failed to obtain M-Pesa access token");
    console.error("Response status:", response.status);
    console.error("Response body:", JSON.stringify(data, null, 2));
    throw new Error(`M-Pesa auth failed: ${data.error_description || data.error || 'Unknown error'}`);
  }
  
  console.log("✓ Access token obtained successfully");
  return data.access_token;
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

    const { action, ...params } = await req.json();

    // Some actions require financial roles (members are allowed to initiate STK pushes)
    const financialActions = ["register_urls", "generate_qr", "create_standing_order"];
    if (financialActions.includes(action) && !hasFinancialRole) {
      throw new Error("Insufficient permissions for financial operations");
    }

    const accessToken = await getAccessToken();
    let result;

    switch (action) {
      case "stk_push": {
        const { phoneNumber, amount, accountReference, transactionDesc, memberId, contributionId } = params;
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        
        // Log access token response
        console.log("Access token obtained successfully");
        
        // Validate amount
        if (amount < 1) {
          throw new Error("Amount must be at least KES 1");
        }
        
        const callbackUrl = `https://oxfkntgntgsebxbpfeyh.supabase.co/functions/v1/mpesa-callback`;
        
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
        
        // Log STK push request payload
        console.log("STK Push Request Payload:", JSON.stringify(stkPayload, null, 2));
        
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
        
        result = await response.json();
        
        // Log Safaricom STK push response
        console.log("Safaricom STK Push Response:", JSON.stringify(result, null, 2));
        
        // Return Safaricom's actual error message instead of generic error
        if (result.errorCode) {
          const errorMsg = result.errorMessage || `M-Pesa Error: ${result.errorCode}`;
          console.error(`STK Push Failed - Code: ${result.errorCode}, Message: ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        if (result.ResponseCode !== "0") {
          const errorMsg = result.ResponseDescription || `Failed with code: ${result.ResponseCode}`;
          console.error(`STK Push Response Error: ${errorMsg}`);
          throw new Error(errorMsg);
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
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        
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
        
        // Update transaction status
        if (result.ResultCode !== undefined) {
          await supabase
            .from("mpesa_transactions")
            .update({
              result_code: result.ResultCode,
              result_desc: result.ResultDesc,
              status: result.ResultCode === 0 ? "completed" : "failed",
            })
            .eq("checkout_request_id", checkoutRequestId);
        }
        
        break;
      }

      case "generate_qr": {
        const { amount, merchantName, refNumber } = params;
        
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

        // Create audit log
        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_QR_GENERATED",
          p_action_description: `Generated QR code for KSh ${amount}`,
          p_entity_type: "mpesa_qr",
          p_metadata: { amount, refNumber },
        });
        
        break;
      }

      case "register_urls": {
        const validationUrl = `${SUPABASE_URL}/functions/v1/mpesa-validation`;
        const confirmationUrl = `${SUPABASE_URL}/functions/v1/mpesa-confirmation`;
        
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
        
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("M-Pesa error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error details: ${message}`);
    
    // Return error with status 400 and detailed message
    return new Response(
      JSON.stringify({ 
        error: message,
        success: false,
        errorCode: "MPESA_REQUEST_FAILED"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
