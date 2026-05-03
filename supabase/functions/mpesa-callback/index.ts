import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyCallbackSignature } from "../_shared/mpesa.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNATURE_SECRET = Deno.env.get("MPESA_CALLBACK_SIGNATURE_SECRET");

interface MpesaTransaction {
  id: string;
  status: string;
  contribution_id: string | null;
  member_id: string | null;
  transaction_type: string | null;
  amount: number | null;
  kitty_id: string | null;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read raw body so we can verify the HMAC signature before trusting any field.
    const rawBody = await req.text();

    // Require signature secret to be configured. Without it, refuse callbacks
    // to prevent forged webhooks from crediting wallets/kitties/contributions.
    if (!SIGNATURE_SECRET) {
      console.error("mpesa-callback: rejected — MPESA_CALLBACK_SIGNATURE_SECRET not configured");
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Callback signature not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const signatureHeader =
      req.headers.get("x-mpesa-signature") ?? req.headers.get("x-signature");
    const signatureValid = await verifyCallbackSignature(rawBody, signatureHeader);
    if (!signatureValid) {
      console.error("mpesa-callback: rejected — invalid signature");
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { Body } = body;
    const { stkCallback } = Body;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    console.log(`mpesa-callback: checkout=${CheckoutRequestID} resultCode=${ResultCode}`);

    let mpesaReceiptNumber = "";
    let amount = 0;
    let phoneNumber = "";
    let transactionDate: Date | null = null;

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

    console.log(`mpesa-callback: parsed checkout=${CheckoutRequestID}`);

    const { data: existingTransaction, error: checkError } = await supabase
      .from("mpesa_transactions")
      .select("id, status, contribution_id, member_id, transaction_type, amount, kitty_id")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing transaction:", checkError);
    }

    let transaction: MpesaTransaction | null = existingTransaction as MpesaTransaction | null;

    if (transaction && transaction.status !== "completed" && transaction.status !== "failed") {
      const { data: updatedTx, error: updateError } = await supabase
        .from("mpesa_transactions")
        .update({
          result_code: ResultCode,
          result_desc: ResultDesc,
          mpesa_receipt_number: mpesaReceiptNumber || undefined,
          phone_number: phoneNumber || undefined,
          transaction_date: transactionDate,
          status: ResultCode === 0 ? "completed" : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", CheckoutRequestID)
        .select("id, status, contribution_id, member_id, transaction_type, amount, kitty_id")
        .single();

      if (updateError) {
        console.error("Error updating transaction:", updateError);
        transaction = null;
      } else {
        transaction = updatedTx as MpesaTransaction;
      }
    } else if (!transaction) {
      console.warn(`Transaction not found for checkout request ${CheckoutRequestID}`);
    }

    // Use the *server-stored* expected amount (set when STK push was initiated)
    // rather than trusting the callback's amount field.
    const expectedAmount = Number(transaction?.amount ?? 0);
    const callbackAmount = Number(amount || 0);
    const amountMatches =
      expectedAmount > 0 &&
      callbackAmount > 0 &&
      Math.abs(expectedAmount - callbackAmount) < 0.01;

    if (ResultCode === 0 && transaction && !amountMatches) {
      console.error(
        `mpesa-callback: amount mismatch checkout=${CheckoutRequestID} — refusing to credit`,
      );
      // Mark as failed so it does not get re-processed.
      await supabase
        .from("mpesa_transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("checkout_request_id", CheckoutRequestID);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Wallet top-up: credit member wallet on success
    if (ResultCode === 0 && transaction?.transaction_type === "wallet_topup" && transaction.member_id) {
      try {
        const { error: walletErr } = await supabase.rpc("process_wallet_transaction", {
          _user_id: transaction.member_id,
          _type: "topup",
          _direction: "credit",
          _amount: expectedAmount,
          _description: `M-Pesa wallet top-up (${mpesaReceiptNumber})`,
          _reference: mpesaReceiptNumber || CheckoutRequestID,
          _mpesa_transaction_id: transaction.id,
          _contribution_id: null,
          _welfare_case_id: null,
          _discipline_id: null,
        });
        if (walletErr) console.error("Wallet credit failed:", walletErr);
      } catch (e) {
        console.error("Wallet credit exception:", e);
      }
    }

    // Kitty M-Pesa contribution: credit kitty balance on success
    if (
      ResultCode === 0 &&
      transaction?.transaction_type === "kitty_contribution" &&
      transaction.kitty_id &&
      transaction.member_id
    ) {
      try {
        const { error: kittyErr } = await supabase.rpc("credit_kitty_from_mpesa", {
          _kitty_id: transaction.kitty_id,
          _member_id: transaction.member_id,
          _amount: expectedAmount,
          _mpesa_transaction_id: transaction.id,
          _reference: mpesaReceiptNumber || CheckoutRequestID,
        });
        if (kittyErr) console.error("Kitty credit failed:", kittyErr);
      } catch (e) {
        console.error("Kitty credit exception:", e);
      }
    }

    if (ResultCode === 0 && transaction?.contribution_id) {
      try {
        const { data: currentContribution } = await supabase
          .from("contributions")
          .select("status, paid_at")
          .eq("id", transaction.contribution_id)
          .single();

        if (currentContribution?.status !== "paid") {
          await supabase
            .from("contributions")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              reference_number: mpesaReceiptNumber,
            })
            .eq("id", transaction.contribution_id);
        }

        if (transaction.member_id) {
          const { data: existingTracking } = await supabase
            .from("contribution_tracking")
            .select("id")
            .eq("member_id", transaction.member_id)
            .single();

          if (existingTracking) {
            await supabase
              .from("contribution_tracking")
              .update({
                last_contribution_date: new Date().toISOString(),
                consecutive_missed: 0,
                last_checked_at: new Date().toISOString(),
              })
              .eq("member_id", transaction.member_id);
          }
        }
      } catch (error) {
        console.error("Error updating contribution:", error);
      }
    }

    try {
      await supabase.rpc("log_audit_action", {
        p_action_type: "MPESA_CALLBACK_PROCESSED",
        p_action_description: `M-Pesa callback processed for ${CheckoutRequestID}`,
        p_entity_type: "mpesa_transaction",
        p_metadata: {
          checkoutRequestId: CheckoutRequestID,
          resultCode: ResultCode,
        },
      });
    } catch (auditError) {
      console.error("Error logging audit action:", auditError);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Callback error:", error instanceof Error ? error.message : "unknown");
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  }
});
