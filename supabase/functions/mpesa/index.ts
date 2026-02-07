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
const logInitialization = () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] M-Pesa Edge Function Initialized`);
  console.log("📋 Credentials Status:");
  console.log(`  ✓ MPESA_CONSUMER_KEY: ${MPESA_CONSUMER_KEY ? `${MPESA_CONSUMER_KEY.substring(0, 10)}...` : "❌ NOT SET"}`);
  console.log(`  ✓ MPESA_CONSUMER_SECRET: ${MPESA_CONSUMER_SECRET ? `${MPESA_CONSUMER_SECRET.substring(0, 10)}...` : "❌ NOT SET"}`);
  console.log(`  ✓ MPESA_SHORTCODE: ${MPESA_SHORTCODE || "❌ NOT SET"}`);
  console.log(`  ✓ MPESA_PASSKEY: ${MPESA_PASSKEY ? `${MPESA_PASSKEY.substring(0, 10)}...` : "❌ NOT SET"}`);
  console.log(`  ✓ MPESA_BASE_URL: ${MPESA_BASE_URL}`);
  console.log(`  ✓ Environment: ${MPESA_BASE_URL.includes("sandbox") ? "SANDBOX (Testing)" : "PRODUCTION"}`);
};
logInitialization();

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] 🔐 Fetching M-Pesa access token...`);
  console.log(`  Consumer Key: ${MPESA_CONSUMER_KEY.substring(0, 15)}...`);
  console.log(`  Base64 Credentials: ${credentials.substring(0, 20)}...`);
  
  try {
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
      const errorTime = new Date().toISOString();
      console.error(`[${errorTime}] ❌ M-Pesa Access Token Request Failed`);
      console.error(`  HTTP Status: ${response.status}`);
      console.error(`  Error Code: ${data.error}`);
      console.error(`  Error Description: ${data.error_description}`);
      console.error(`  Full Response: ${JSON.stringify(data, null, 2)}`);
      throw new Error(`M-Pesa auth failed: ${data.error_description || data.error || 'Unknown error'}`);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Access token obtained successfully`);
    console.log(`  Token Expires In: ${data.expires_in} seconds`);
    return data.access_token;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Access token fetch error:`, error);
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
        const requestTime = new Date().toISOString();
        
        console.log(`[${requestTime}] 💳 STK Push Request Initiated`);
        console.log(`  Phone Number: ${phoneNumber}`);
        console.log(`  Amount: KSh ${amount}`);
        console.log(`  Account Reference: ${accountReference || "TuruturuStars"}`);
        console.log(`  Transaction Description: ${transactionDesc || "Contribution"}`);
        if (memberId) console.log(`  Member ID: ${memberId}`);
        if (contributionId) console.log(`  Contribution ID: ${contributionId}`);
        
        // Validate amount
        if (amount < 1) {
          console.error(`[${new Date().toISOString()}] ❌ Invalid amount: ${amount} (minimum: 1)`);
          throw new Error("Amount must be at least KES 1");
        }
        
        const callbackUrl = `https://mkcgkfzltohxagqvsbqk.functions.supabase.co/functions/v1/mpesa-callback`;
        
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
        
        console.log(`[${requestTime}] 📤 Sending STK Push to Safaricom`);
        console.log(`  Payload: ${JSON.stringify(stkPayload, null, 2)}`);
        
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
        const responseTime = new Date().toISOString();
        
        console.log(`[${responseTime}] 📥 Safaricom STK Push Response Received`);
        console.log(`  Response Code: ${result.ResponseCode}`);
        console.log(`  Response Description: ${result.ResponseDescription}`);
        if (result.MerchantRequestID) console.log(`  Merchant Request ID: ${result.MerchantRequestID}`);
        if (result.CheckoutRequestID) console.log(`  Checkout Request ID: ${result.CheckoutRequestID}`);
        console.log(`  Full Response: ${JSON.stringify(result, null, 2)}`);
        
        // Return Safaricom's actual error message instead of generic error
        if (result.errorCode) {
          const errorMsg = result.errorMessage || `M-Pesa Error: ${result.errorCode}`;
          console.error(`[${new Date().toISOString()}] ❌ STK Push Failed - Code: ${result.errorCode}`);
          console.error(`  Message: ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        if (result.ResponseCode !== "0") {
          const errorMsg = result.ResponseDescription || `Failed with code: ${result.ResponseCode}`;
          console.error(`[${new Date().toISOString()}] ❌ STK Push Response Error: ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        // Log the transaction
        console.log(`[${new Date().toISOString()}] 💾 Recording transaction in database...`);
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
        console.log(`[${new Date().toISOString()}] ✅ Transaction recorded`);

        // Create audit log
        console.log(`[${new Date().toISOString()}] 📝 Creating audit log...`);
        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_STK_PUSH",
          p_action_description: `Initiated STK push for KSh ${amount} to ${phoneNumber}`,
          p_entity_type: "mpesa_transaction",
          p_metadata: { amount, phoneNumber, checkoutRequestId: result.CheckoutRequestID },
        });
        console.log(`[${new Date().toISOString()}] ✅ Audit log created`);
        
        break;
      }

      case "query_status": {
        const { checkoutRequestId } = params;
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        const queryTime = new Date().toISOString();
        
        console.log(`[${queryTime}] 🔍 Querying STK Push Status`);
        console.log(`  Checkout Request ID: ${checkoutRequestId}`);
        
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
        
        console.log(`[${statusResponseTime}] 📊 Status Query Response Received`);
        console.log(`  Result Code: ${result.ResultCode}`);
        console.log(`  Result Description: ${result.ResultDesc}`);
        console.log(`  Response: ${JSON.stringify(result, null, 2)}`);
        
        // Update transaction status
        if (result.ResultCode !== undefined) {
          console.log(`[${new Date().toISOString()}] 💾 Updating transaction status in database...`);
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
          
          console.log(`[${updateTime}] ✅ Transaction status updated: ${newStatus}`);
        }
        
        break;
      }

      case "generate_qr": {
        const { amount, merchantName, refNumber } = params;
        const qrTime = new Date().toISOString();
        
        console.log(`[${qrTime}] 🔲 QR Code Generation Request`);
        console.log(`  Merchant: ${merchantName || "Turuturu Stars CBO"}`);
        console.log(`  Reference: ${refNumber || "TSCBO"}`);
        console.log(`  Amount: KSh ${amount}`);
        
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
        
        console.log(`[${qrResponseTime}] ✅ QR Code Generated Successfully`);
        if (result.QRcode) console.log(`  QR Code: ${result.QRcode.substring(0, 50)}...`);
        console.log(`  Response Code: ${result.ResponseCode}`);

        // Create audit log
        console.log(`[${new Date().toISOString()}] 📝 Creating QR generation audit log...`);
        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_QR_GENERATED",
          p_action_description: `Generated QR code for KSh ${amount}`,
          p_entity_type: "mpesa_qr",
          p_metadata: { amount, refNumber, merchantName },
        });
        console.log(`[${new Date().toISOString()}] ✅ Audit log created`);
        
        break;
      }

      case "register_urls": {
        const registerTime = new Date().toISOString();
        const validationUrl = `${SUPABASE_URL}/functions/v1/mpesa-validation`;
        const confirmationUrl = `${SUPABASE_URL}/functions/v1/mpesa-confirmation`;
        
        console.log(`[${registerTime}] 🔗 Registering M-Pesa Callback URLs`);
        console.log(`  Validation URL: ${validationUrl}`);
        console.log(`  Confirmation URL: ${confirmationUrl}`);
        console.log(`  Short Code: ${MPESA_SHORTCODE}`);
        
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
        
        console.log(`[${registerResponseTime}] 📊 URL Registration Response`);
        console.log(`  Response Code: ${result.ResponseCode}`);
        console.log(`  Response Description: ${result.ResponseDescription}`);

        // Create audit log
        console.log(`[${new Date().toISOString()}] 📝 Creating URL registration audit log...`);
        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_URL_REGISTERED",
          p_action_description: "Registered M-Pesa callback URLs",
          p_entity_type: "mpesa_config",
          p_metadata: { validationUrl, confirmationUrl },
        });
        console.log(`[${new Date().toISOString()}] ✅ Audit log created`);
        
        break;
      }

      case "simulate_c2b": {
        const { phoneNumber, amount, billRefNumber } = params;
        const simulateTime = new Date().toISOString();
        
        console.log(`[${simulateTime}] 🧪 Simulating C2B Transaction (Testing)`);
        console.log(`  Phone: ${phoneNumber}`);
        console.log(`  Amount: KSh ${amount}`);
        console.log(`  Bill Reference: ${billRefNumber || "Test"}`);
        
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
        
        console.log(`[${simulateResponseTime}] 📊 C2B Simulation Response`);
        console.log(`  Response Code: ${result.ResponseCode}`);
        console.log(`  Response Description: ${result.ResponseDescription}`);
        console.log(`  Full Response: ${JSON.stringify(result, null, 2)}`);
        
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorTime = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[${errorTime}] ❌ M-Pesa Edge Function Error Occurred`);
    console.error(`  Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`  Error Message: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error(`  Stack Trace: ${error.stack}`);
    }
    console.error(`  Error Details: ${JSON.stringify(error, null, 2)}`);
    
    // Return error with status 400 and detailed message
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        errorCode: "MPESA_REQUEST_FAILED",
        timestamp: errorTime,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
