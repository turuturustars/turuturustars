import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const body = await req.json();
    
    // Do not log full payload (PII + payment data); only log non-sensitive identifiers below.
    
    const { Body } = body;
    const { stkCallback } = Body;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    
    // Log callback result details
    console.log(`mpesa-callback: checkout=${CheckoutRequestID} resultCode=${ResultCode}`);
    
    // Extract callback metadata
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
    
    console.log(`mpesa-callback: parsed checkout=${CheckoutRequestID} amount=${amount}`);
    
    // Check if transaction already exists to ensure idempotency
    const { data: existingTransaction, error: checkError } = await supabase
      .from("mpesa_transactions")
      .select("id, status, contribution_id, member_id, transaction_type, amount, kitty_id")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();
    
    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing transaction:", checkError);
    }
    
    let transaction: MpesaTransaction | null = existingTransaction as MpesaTransaction | null;
    
    // Handle both successful and failed transactions
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
        console.log(`Transaction status updated to: ${ResultCode === 0 ? "completed" : "failed"}`);
      }
    } else if (!transaction) {
      console.warn(`Transaction not found for checkout request ${CheckoutRequestID}`);
    } else {
      console.log(`Transaction ${CheckoutRequestID} already processed with status: ${transaction.status}`);
    }
    
    // Wallet top-up: credit member wallet on success
    if (ResultCode === 0 && transaction?.transaction_type === "wallet_topup" && transaction.member_id) {
      try {
        const { error: walletErr } = await supabase.rpc("process_wallet_transaction", {
          _user_id: transaction.member_id,
          _type: "topup",
          _direction: "credit",
          _amount: Number(amount || transaction.amount || 0),
          _description: `M-Pesa wallet top-up (${mpesaReceiptNumber})`,
          _reference: mpesaReceiptNumber || CheckoutRequestID,
          _mpesa_transaction_id: transaction.id,
          _contribution_id: null,
          _welfare_case_id: null,
          _discipline_id: null,
        });
        if (walletErr) console.error("Wallet credit failed:", walletErr);
        else console.log(`Wallet credited for member ${transaction.member_id}: ${amount}`);
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
          _amount: Number(amount || transaction.amount || 0),
          _mpesa_transaction_id: transaction.id,
          _reference: mpesaReceiptNumber || CheckoutRequestID,
        });
        if (kittyErr) console.error("Kitty credit failed:", kittyErr);
        else console.log(`Kitty ${transaction.kitty_id} credited: ${amount}`);
      } catch (e) {
        console.error("Kitty credit exception:", e);
      }
    }

    // If payment successful and transaction exists, update contribution status
    if (ResultCode === 0 && transaction?.contribution_id) {
      try {
        // Get current contribution status
        const { data: currentContribution } = await supabase
          .from("contributions")
          .select("status, paid_at")
          .eq("id", transaction.contribution_id)
          .single();
        
        // Only update if not already marked as paid
        if (currentContribution?.status !== "paid") {
          await supabase
            .from("contributions")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              reference_number: mpesaReceiptNumber,
            })
            .eq("id", transaction.contribution_id);
          
          console.log(`Updated contribution ${transaction.contribution_id} to paid status`);
        }
        
        // Update contribution tracking if member exists
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
            
            console.log(`Updated contribution tracking for member ${transaction.member_id}`);
          }
        }
      } catch (error) {
        console.error("Error updating contribution:", error);
        // Don't fail the callback response even if contribution update fails
      }
    }
    
    // Log audit action
    try {
      await supabase.rpc("log_audit_action", {
        p_action_type: "MPESA_CALLBACK_PROCESSED",
        p_action_description: `M-Pesa callback processed for ${CheckoutRequestID} - ${ResultDesc}`,
        p_entity_type: "mpesa_transaction",
        p_metadata: {
          checkoutRequestId: CheckoutRequestID,
          resultCode: ResultCode,
          amount: amount,
          mpesaReceipt: mpesaReceiptNumber,
        },
      });
    } catch (auditError) {
      console.error("Error logging audit action:", auditError);
      // Don't fail if audit logging fails
    }
    
    // Always respond with success to M-Pesa to confirm receipt
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Callback error:", error);
    
    // Still return 200 to acknowledge receipt, but log the error
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
