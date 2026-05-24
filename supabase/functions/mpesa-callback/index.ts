import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isCallbackTokenValid, verifyCallbackSignature } from "../_shared/mpesa.ts";
import { notifyTreasurersOfMoneyEvent } from "../_shared/treasurer-whatsapp.ts";

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
  phone_number: string | null;
  checkout_request_id: string | null;
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
      "Pay with M-Pesa was not completed.",
      friendlyMpesaFailureReason(resultDescription),
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

type SmartPaymentSendResult = {
  providerMessageId: string | null;
  whatsappMessageId: string | null;
};

function formatKesAmount(amount: number) {
  return Number(amount || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function isMpesaConfigurationFailure(reason: string | null | undefined): boolean {
  return /\b(?:initiator information is invalid|invalid initiator|invalid shortcode|invalid passkey|invalid access token|invalid credentials|securitycredential|credential|paybill)\b/i.test(reason || "");
}

function friendlyMpesaFailureReason(reason: string | null | undefined): string {
  const clean = typeof reason === "string" ? reason.trim() : "";
  if (isMpesaConfigurationFailure(clean)) {
    return "M-Pesa rejected the payment setup. A treasurer/admin should check the Paybill/STK credentials. Your money has not been recorded as received.";
  }

  if (/\b(?:ds timeout|user cannot be reached|request timed out|timeout|timed out)\b/i.test(clean)) {
    return "The M-Pesa prompt did not reach/complete on time. Reply RETRY to send it again, or send a new amount if you want to change it.";
  }

  if (/\b(?:cancelled|canceled|user cancelled|cancel)\b/i.test(clean)) {
    return "The M-Pesa prompt was cancelled. Reply RETRY to send it again.";
  }

  return clean || "Please try again or contact the treasurer.";
}

async function getKittyTitle(supabase: SupabaseClient, kittyId: string | null): Promise<string | null> {
  if (!kittyId) return null;

  const { data, error } = await supabase
    .from("kitties")
    .select("title")
    .eq("id", kittyId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load kitty title for WhatsApp confirmation:", error);
    return null;
  }

  return typeof data?.title === "string" && data.title.trim() ? data.title.trim() : null;
}

async function getWelfareCaseTitleForContribution(supabase: SupabaseClient, contributionId: string | null): Promise<string | null> {
  if (!contributionId) return null;

  const { data: contribution, error: contributionError } = await supabase
    .from("contributions")
    .select("welfare_case_id")
    .eq("id", contributionId)
    .maybeSingle();

  if (contributionError) {
    console.error("Failed to load welfare contribution for WhatsApp confirmation:", contributionError);
    return null;
  }

  const welfareCaseId = typeof contribution?.welfare_case_id === "string" ? contribution.welfare_case_id : null;
  if (!welfareCaseId) return null;

  const { data, error } = await supabase
    .from("welfare_cases")
    .select("title")
    .eq("id", welfareCaseId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load welfare title for WhatsApp confirmation:", error);
    return null;
  }

  return typeof data?.title === "string" && data.title.trim() ? data.title.trim() : null;
}

function transactionAlertTitle(transactionType: string | null, success: boolean): string {
  const status = success ? "completed" : "failed";
  if (transactionType === "wallet_topup") return `Wallet top-up ${status}`;
  if (transactionType === "contribution") return `Contribution payment ${status}`;
  if (transactionType === "kitty_contribution") return `Kitty contribution ${status}`;
  if (transactionType === "welfare_contribution") return `Welfare contribution ${status}`;
  return `Pay with M-Pesa ${status}`;
}

async function notifyTreasurersForMpesaTransaction(
  supabase: SupabaseClient,
  transaction: MpesaTransaction | null,
  success: boolean,
  amount: number,
  receiptNumber: string,
  resultDescription: string,
  checkoutRequestId: string,
  phoneNumber: string,
) {
  if (!transaction) return;

  const details = transaction.transaction_type === "kitty_contribution"
    ? await getKittyTitle(supabase, transaction.kitty_id)
    : transaction.transaction_type === "welfare_contribution"
      ? await getWelfareCaseTitleForContribution(supabase, transaction.contribution_id)
      : null;
  const setupHint = !success && isMpesaConfigurationFailure(resultDescription)
    ? "ACTION NEEDED: Check M-Pesa Paybill/STK credentials, shortcode, passkey, and initiator setup."
    : "";

  await notifyTreasurersOfMoneyEvent(supabase, {
    title: transactionAlertTitle(transaction.transaction_type, success),
    amount,
    status: success ? "completed" : "failed",
    source: "mpesa-callback",
    memberId: transaction.member_id,
    memberPhone: transaction.phone_number || phoneNumber || null,
    reference: receiptNumber || transaction.checkout_request_id || checkoutRequestId,
    checkoutRequestId,
    transactionId: transaction.id,
    details: details
      ? `${transaction.transaction_type === "welfare_contribution" ? "Welfare" : "Kitty"}: ${details}. ${resultDescription || ""} ${setupHint}`.trim()
      : `${resultDescription || ""} ${setupHint}`.trim() || null,
  });
}

async function sendSmartWhatsAppPaymentUpdate(
  supabase: SupabaseClient,
  transaction: MpesaTransaction,
  success: boolean,
  amount: number,
  receiptNumber: string,
  resultDescription: string,
): Promise<SmartPaymentSendResult | null> {
  if (!transaction.phone_number || !transaction.member_id) {
    return null;
  }

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log("WhatsApp credentials not configured; skipping smart-bot payment confirmation");
    return null;
  }

  const kittyTitle = transaction.transaction_type === "kitty_contribution"
    ? await getKittyTitle(supabase, transaction.kitty_id)
    : null;
  const welfareTitle = transaction.transaction_type === "welfare_contribution"
    ? await getWelfareCaseTitleForContribution(supabase, transaction.contribution_id)
    : null;
  let successfulServiceLine = "Your kitty contribution has been confirmed.";
  if (transaction.transaction_type === "wallet_topup") {
    successfulServiceLine = "Your wallet top-up has been confirmed.";
  } else if (transaction.transaction_type === "contribution") {
    successfulServiceLine = "Your contribution payment has been confirmed.";
  } else if (transaction.transaction_type === "welfare_contribution") {
    successfulServiceLine = welfareTitle
      ? `Your welfare contribution to ${welfareTitle} has been confirmed.`
      : "Your welfare contribution has been confirmed.";
  } else if (kittyTitle) {
    successfulServiceLine = `Your contribution to ${kittyTitle} has been confirmed.`;
  }

  const body = success
    ? [
      `Payment received: KES ${formatKesAmount(amount)}`,
      receiptNumber ? `Receipt: ${receiptNumber}` : null,
      successfulServiceLine,
    ].filter(Boolean).join("\n")
    : [
      "Pay with M-Pesa was not completed.",
      friendlyMpesaFailureReason(resultDescription),
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
        to: transaction.phone_number,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    },
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || "WhatsApp smart-bot payment confirmation failed");
  }

  const providerMessageId = result?.messages?.[0]?.id ?? null;
  const { data: loggedMessage, error: logError } = await supabase.from("whatsapp_messages").insert({
    provider_message_id: providerMessageId,
    wa_message_id: providerMessageId,
    direction: "outbound",
    phone: transaction.phone_number,
    profile_id: transaction.member_id,
    member_id: transaction.member_id,
    message_type: "text",
    body,
    text_body: body,
    status: providerMessageId ? "sent" : "failed",
    provider_response: result ?? {},
    payload: result ?? {},
    raw_payload: {
      source: "mpesa-callback",
      checkout_request_id: transaction.checkout_request_id,
      mpesa_transaction_id: transaction.id,
    },
  }).select("id").maybeSingle();

  if (logError) {
    console.error("Failed to log smart-bot WhatsApp payment confirmation:", logError);
  }

  return {
    providerMessageId,
    whatsappMessageId: loggedMessage?.id ? String(loggedMessage.id) : null,
  };
}

async function markQueuedPaymentNotificationSent(
  supabase: SupabaseClient,
  transaction: MpesaTransaction,
  sendResult: SmartPaymentSendResult,
) {
  if (!transaction.member_id || !sendResult.providerMessageId) return;

  const { error } = await supabase
    .from("whatsapp_notifications_queue")
    .update({
      status: "sent",
      provider_message_id: sendResult.providerMessageId,
      whatsapp_message_id: sendResult.whatsappMessageId,
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("user_id", transaction.member_id)
    .eq("event_type", "payment_success")
    .eq("event_id", transaction.id)
    .in("status", ["pending", "processing"]);

  if (error) {
    console.error("Failed to mark queued WhatsApp payment notification sent:", error);
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read raw body so we can verify the HMAC signature before trusting any field.
    const rawBody = await req.text();

    if (SIGNATURE_SECRET) {
      const tokenValid = isCallbackTokenValid(req.url, SIGNATURE_SECRET);

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
      .select("id, status, contribution_id, member_id, transaction_type, amount, kitty_id, phone_number, checkout_request_id")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing transaction:", checkError);
    }

    let transaction: MpesaTransaction | null = existingTransaction as MpesaTransaction | null;
    let transactionJustResolved = false;

    // Use the *server-stored* expected amount (set when STK push was initiated)
    // rather than trusting the callback's amount field.
    const expectedAmount = Number(transaction?.amount ?? 0);
    const callbackAmount = Number(amount || 0);
    const amountMatches =
      expectedAmount > 0 &&
      callbackAmount > 0 &&
      Math.abs(expectedAmount - callbackAmount) < 0.01;
    const amountMismatch = Boolean(ResultCode === 0 && transaction && !amountMatches);
    const mpesaSucceeded = ResultCode === 0 && !amountMismatch;
    const effectiveResultDesc = amountMismatch
      ? `${ResultDesc || "M-Pesa callback succeeded"}; amount mismatch (expected KES ${expectedAmount}, callback KES ${callbackAmount})`
      : ResultDesc;

    if (transaction && transaction.status !== "completed" && transaction.status !== "failed") {
      const { data: updatedTx, error: updateError } = await supabase
        .from("mpesa_transactions")
        .update({
          result_code: ResultCode,
          result_desc: effectiveResultDesc,
          mpesa_receipt_number: mpesaReceiptNumber || undefined,
          phone_number: phoneNumber || undefined,
          transaction_date: transactionDate,
          status: mpesaSucceeded ? "completed" : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", CheckoutRequestID)
        .select("id, status, contribution_id, member_id, transaction_type, amount, kitty_id, phone_number, checkout_request_id")
        .single();

      if (updateError) {
        console.error("Error updating transaction:", updateError);
        transaction = null;
      } else {
        transaction = updatedTx as MpesaTransaction;
        transactionJustResolved = true;
      }
    } else if (!transaction) {
      console.warn(`Transaction not found for checkout request ${CheckoutRequestID}`);
    }

    if (amountMismatch) {
      console.error(
        `mpesa-callback: amount mismatch checkout=${CheckoutRequestID} — refusing to credit`,
      );
    }

    // Wallet top-up: credit member wallet on success
    if (mpesaSucceeded && transaction?.transaction_type === "wallet_topup" && transaction.member_id) {
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
      mpesaSucceeded &&
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

    if (mpesaSucceeded && transaction?.contribution_id) {
      try {
        const { data: updatedContribution, error: contributionUpdateError } = await supabase
          .from("contributions")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            reference_number: mpesaReceiptNumber,
          })
          .eq("id", transaction.contribution_id)
          .neq("status", "paid")
          .select("status, paid_at, welfare_case_id, amount, contribution_type")
          .maybeSingle();

        if (contributionUpdateError) {
          throw contributionUpdateError;
        }

        const contributionJustMarkedPaid = updatedContribution as Record<string, unknown> | null;
        const welfareCaseId = typeof contributionJustMarkedPaid?.welfare_case_id === "string"
          ? contributionJustMarkedPaid.welfare_case_id
          : null;
        if (welfareCaseId) {
          const welfareAmount = expectedAmount || Number(contributionJustMarkedPaid?.amount || 0);
          const { data: welfareCase, error: welfareLoadError } = await supabase
            .from("welfare_cases")
            .select("collected_amount")
            .eq("id", welfareCaseId)
            .maybeSingle();

          if (welfareLoadError) {
            console.error("Error loading welfare case for M-Pesa contribution:", welfareLoadError);
          } else {
            await supabase
              .from("welfare_cases")
              .update({ collected_amount: Number(welfareCase?.collected_amount || 0) + welfareAmount })
              .eq("id", welfareCaseId);
          }

          if (transaction.member_id) {
            const { error: welfareTransactionError } = await supabase
              .from("welfare_transactions")
              .insert({
                welfare_case_id: welfareCaseId,
                amount: welfareAmount,
                transaction_type: "contribution",
                mpesa_code: mpesaReceiptNumber || CheckoutRequestID,
                recorded_by_id: transaction.member_id,
                notes: "WhatsApp M-Pesa welfare contribution",
                status: "completed",
              });

            if (welfareTransactionError) {
              console.error("Error recording welfare transaction from M-Pesa:", welfareTransactionError);
            }
          } else {
            console.error("Cannot record welfare transaction without member_id", { transactionId: transaction.id });
          }
        }

        if (contributionJustMarkedPaid && transaction.member_id) {
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

    if (!mpesaSucceeded && (transaction?.transaction_type === "welfare_contribution" || transaction?.transaction_type === "contribution") && transaction.contribution_id) {
      try {
        const { error: deleteContributionError } = await supabase
          .from("contributions")
          .delete()
          .eq("id", transaction.contribution_id)
          .eq("status", "pending");

        if (deleteContributionError) {
          console.error("Error deleting failed WhatsApp contribution:", deleteContributionError);
        }
      } catch (error) {
        console.error("Error cleaning failed WhatsApp contribution:", error);
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
        const intentStatus = mpesaSucceeded ? "completed" : "failed";

        await supabase
          .from("whatsapp_payment_intents")
          .update({
            status: intentStatus,
            failure_reason: mpesaSucceeded ? null : effectiveResultDesc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", intent.id);

        const contributionIds = Array.isArray(intent.contribution_ids) ? intent.contribution_ids : [];
        if (mpesaSucceeded && intent.payment_purpose === "contribution" && contributionIds.length > 0) {
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

        if (mpesaSucceeded && intent.payment_purpose === "wallet_topup" && intent.wallet_transaction_id) {
          const { error: walletCreditError } = await supabase.rpc("credit_member_wallet", {
            p_wallet_transaction_id: intent.wallet_transaction_id,
            p_amount: amount || intent.amount,
            p_reference_number: mpesaReceiptNumber || null,
          });

          if (walletCreditError) {
            console.error("Error crediting WhatsApp wallet top-up:", walletCreditError);
          }
        }

        if (mpesaSucceeded && intent.payment_purpose === "wallet_topup" && transaction?.id) {
          const canonicalWalletAmount = expectedAmount || amount || intent.amount;
          const { error: canonicalWalletCreditError } = await supabase.rpc("process_wallet_transaction", {
            _user_id: transaction.member_id || intent.member_id,
            _type: "topup",
            _direction: "credit",
            _amount: canonicalWalletAmount,
            _description: `M-Pesa wallet top-up (${mpesaReceiptNumber || CheckoutRequestID})`,
            _reference: mpesaReceiptNumber || CheckoutRequestID,
            _mpesa_transaction_id: transaction.id,
            _contribution_id: null,
            _welfare_case_id: null,
            _discipline_id: null,
          });

          if (canonicalWalletCreditError) {
            console.error("Error crediting canonical wallet top-up:", canonicalWalletCreditError);
          }
        }

        if (!mpesaSucceeded && intent.payment_purpose === "wallet_topup" && intent.wallet_transaction_id) {
          const { error: walletFailureError } = await supabase
            .from("member_wallet_transactions")
            .update({
              status: "failed",
              description: effectiveResultDesc || "M-Pesa wallet top-up failed",
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
            mpesaSucceeded,
            amount || intent.amount,
            mpesaReceiptNumber,
            effectiveResultDesc,
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
          title: mpesaSucceeded ? "Payment received" : "Payment failed",
          message: mpesaSucceeded
            ? `Pay with M-Pesa of KES ${amount || intent.amount} has been received. Receipt: ${mpesaReceiptNumber || "pending"}`
            : `Pay with M-Pesa was not completed: ${friendlyMpesaFailureReason(effectiveResultDesc)}`,
          type: intent.payment_purpose === "wallet_topup" ? "wallet" : "contribution",
          sent_via: ["whatsapp"],
          whatsapp_status: whatsappStatus,
          whatsapp_message_id: whatsappMessageId,
          whatsapp_sent_at: whatsappMessageId ? new Date().toISOString() : null,
          whatsapp_error: whatsappSendError,
          read: false,
        });
      } else if (
        transactionJustResolved &&
        transaction?.member_id &&
        transaction.phone_number &&
        (transaction.transaction_type === "wallet_topup" || transaction.transaction_type === "contribution" || transaction.transaction_type === "kitty_contribution" || transaction.transaction_type === "welfare_contribution")
      ) {
        const notificationAmount = expectedAmount || amount;
        let sendResult: SmartPaymentSendResult | null = null;
        let whatsappSendError: string | null = null;

        try {
          sendResult = await sendSmartWhatsAppPaymentUpdate(
            supabase,
            transaction,
            mpesaSucceeded,
            notificationAmount,
            mpesaReceiptNumber,
            effectiveResultDesc,
          );
          if (sendResult) {
            await markQueuedPaymentNotificationSent(supabase, transaction, sendResult);
          }
        } catch (sendError) {
          whatsappSendError = sendError instanceof Error ? sendError.message : "WhatsApp smart-bot confirmation failed";
          console.error("Error sending smart-bot WhatsApp payment confirmation:", sendError);
        }

        const whatsappMessageId = sendResult?.providerMessageId ?? null;
        const whatsappStatus = whatsappSendError
          ? "failed"
          : whatsappMessageId
            ? "sent"
            : "skipped";
        const notificationType = transaction.transaction_type === "wallet_topup"
          ? "wallet_topup"
          : transaction.transaction_type === "contribution"
            ? "contribution"
          : transaction.transaction_type === "welfare_contribution"
            ? "welfare_contribution"
            : "kitty_contribution";

        await supabase.from("notifications").insert({
          user_id: transaction.member_id,
          title: mpesaSucceeded ? "Payment received" : "Payment failed",
          message: mpesaSucceeded
            ? `Pay with M-Pesa of KES ${formatKesAmount(notificationAmount)} has been received. Receipt: ${mpesaReceiptNumber || "pending"}`
            : `Pay with M-Pesa was not completed: ${friendlyMpesaFailureReason(effectiveResultDesc)}`,
          type: notificationType,
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

    if (transactionJustResolved && transaction) {
      try {
        await notifyTreasurersForMpesaTransaction(
          supabase,
          transaction,
          mpesaSucceeded,
          expectedAmount || amount || transaction.amount || 0,
          mpesaReceiptNumber,
          effectiveResultDesc,
          CheckoutRequestID,
          phoneNumber,
        );
      } catch (treasurerAlertError) {
        console.error("Error sending treasurer WhatsApp money alert:", treasurerAlertError);
      }
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
