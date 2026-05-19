import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyCallbackSignature } from "../_shared/mpesa.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNATURE_SECRET = Deno.env.get("MPESA_CALLBACK_SIGNATURE_SECRET");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const WHATSAPP_GRAPH_VERSION =
  Deno.env.get("WHATSAPP_GRAPH_API_VERSION") ?? Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v21.0";

interface MpesaTransaction {
  id: string;
  status: string;
  contribution_id: string | null;
  member_id: string | null;
  transaction_type: string | null;
  amount: number | null;
  kitty_id: string | null;
}

interface StkCallbackMetadataItem {
  Name: string;
  Value?: string | number;
}

interface StkCallbackPayload {
  Body?: {
    stkCallback?: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item?: StkCallbackMetadataItem[];
      };
    };
  };
}

interface WhatsappPaymentIntent {
  id: string;
  contact_id: string | null;
  member_id: string;
  phone_number: string;
  amount: number;
  payment_purpose: "contribution" | "wallet_topup";
  contribution_ids: string[];
  wallet_transaction_id: string | null;
}

type SupabaseClient = ReturnType<typeof createClient>;

async function sendWhatsAppPaymentUpdate(
  supabase: SupabaseClient,
  intent: WhatsappPaymentIntent,
  success: boolean,
  amount: number,
  receiptNumber: string,
  resultDescription: string,
) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log("WhatsApp credentials not configured; skipping WhatsApp payment confirmation");
    return null;
  }

  const successfulServiceLine = intent.payment_purpose === "wallet_topup"
    ? "Your wallet has been updated."
    : "Your contribution record has been updated.";

  const body = success
    ? [
      `Payment received: KES ${amount}`,
      receiptNumber ? `Receipt: ${receiptNumber}` : null,
      successfulServiceLine,
    ].filter(Boolean).join("\n")
    : [
      "M-Pesa payment was not completed.",
      resultDescription || "Please try again or contact the treasurer.",
    ].join("\n");

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: intent.phone_number,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || "WhatsApp payment confirmation failed");
  }

  await supabase.from("whatsapp_messages").insert({
    contact_id: intent.contact_id,
    member_id: intent.member_id,
    wa_message_id: result?.messages?.[0]?.id ?? null,
    direction: "outbound",
    message_type: "text",
    text_body: body,
    payload: result ?? {},
    status: result?.messages?.[0]?.id ? "sent" : "failed",
  });

  return result?.messages?.[0]?.id ?? null;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read raw body so we can verify the HMAC signature before trusting any field.
    const rawBody = await req.text();

    if (SIGNATURE_SECRET) {
      const callbackToken = new URL(req.url).searchParams.get("token");
      const tokenValid = callbackToken === SIGNATURE_SECRET;

      if (!tokenValid) {
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
      }
    } else {
      console.warn("mpesa-callback: MPESA_CALLBACK_SIGNATURE_SECRET is not configured");
    }

    let body: StkCallbackPayload;
    try {
      body = JSON.parse(rawBody) as StkCallbackPayload;
    } catch {
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { Body } = body;
    const { stkCallback } = Body ?? {};
    if (!stkCallback) {
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Missing STK callback" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

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
            mpesaReceiptNumber = String(item.Value ?? "");
            break;
          case "Amount":
            amount = Number(item.Value ?? 0);
            break;
          case "PhoneNumber":
            phoneNumber = String(item.Value);
            break;
          case "TransactionDate": {
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

    // If this STK push was started from WhatsApp, reconcile all linked contributions
    // and send a payment confirmation back in the same WhatsApp thread.
    try {
      const { data: whatsappIntent, error: intentError } = await supabase
        .from("whatsapp_payment_intents")
        .select("id, contact_id, member_id, phone_number, amount, payment_purpose, contribution_ids, wallet_transaction_id")
        .eq("checkout_request_id", CheckoutRequestID)
        .maybeSingle();

      if (intentError) {
        console.error("Error checking WhatsApp payment intent:", intentError);
      }

      if (whatsappIntent) {
        const intent = whatsappIntent as WhatsappPaymentIntent;
        const intentStatus = ResultCode === 0 ? "completed" : "failed";

        await supabase
          .from("whatsapp_payment_intents")
          .update({
            status: intentStatus,
            failure_reason: ResultCode === 0 ? null : ResultDesc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", intent.id);

        const contributionIds = Array.isArray(intent.contribution_ids) ? intent.contribution_ids : [];
        if (ResultCode === 0 && intent.payment_purpose === "contribution" && contributionIds.length > 0) {
          const { error: contributionUpdateError } = await supabase
            .from("contributions")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              reference_number: mpesaReceiptNumber,
              updated_at: new Date().toISOString(),
            })
            .in("id", contributionIds);

          if (contributionUpdateError) {
            console.error("Error updating WhatsApp-linked contributions:", contributionUpdateError);
          }
        }

        if (ResultCode === 0 && intent.payment_purpose === "wallet_topup" && intent.wallet_transaction_id) {
          const { error: walletCreditError } = await supabase.rpc("credit_member_wallet", {
            p_wallet_transaction_id: intent.wallet_transaction_id,
            p_amount: amount || intent.amount,
            p_reference_number: mpesaReceiptNumber || null,
          });

          if (walletCreditError) {
            console.error("Error crediting WhatsApp wallet top-up:", walletCreditError);
          }
        }

        if (ResultCode !== 0 && intent.payment_purpose === "wallet_topup" && intent.wallet_transaction_id) {
          const { error: walletFailureError } = await supabase
            .from("member_wallet_transactions")
            .update({
              status: "failed",
              description: ResultDesc || "M-Pesa wallet top-up failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", intent.wallet_transaction_id)
            .eq("status", "pending");

          if (walletFailureError) {
            console.error("Error marking wallet top-up failed:", walletFailureError);
          }
        }

        let whatsappMessageId: string | null = null;
        let whatsappSendError: string | null = null;
        try {
          whatsappMessageId = await sendWhatsAppPaymentUpdate(
            supabase,
            intent,
            ResultCode === 0,
            amount || intent.amount,
            mpesaReceiptNumber,
            ResultDesc,
          );
        } catch (sendError) {
          whatsappSendError = sendError instanceof Error ? sendError.message : "WhatsApp confirmation failed";
          console.error("Error sending WhatsApp payment confirmation:", sendError);
        }

        const whatsappStatus = whatsappSendError
          ? "failed"
          : whatsappMessageId
            ? "sent"
            : "skipped";

        await supabase.from("notifications").insert({
          user_id: intent.member_id,
          title: ResultCode === 0 ? "Payment received" : "Payment failed",
          message: ResultCode === 0
            ? `M-Pesa payment of KES ${amount || intent.amount} has been received. Receipt: ${mpesaReceiptNumber || "pending"}`
            : `M-Pesa payment was not completed: ${ResultDesc}`,
          type: intent.payment_purpose === "wallet_topup" ? "wallet" : "contribution",
          sent_via: ["whatsapp"],
          whatsapp_status: whatsappStatus,
          whatsapp_message_id: whatsappMessageId,
          whatsapp_sent_at: whatsappMessageId ? new Date().toISOString() : null,
          whatsapp_error: whatsappSendError,
          read: false,
        });
      }
    } catch (whatsappError) {
      console.error("Error processing WhatsApp payment reconciliation:", whatsappError);
      // Do not fail the M-Pesa callback response if WhatsApp follow-up fails.
    }
    
    // Log audit action
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
