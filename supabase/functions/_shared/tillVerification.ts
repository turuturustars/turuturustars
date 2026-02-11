import { HttpError } from "./http.ts";
import { logCallbackAudit, normalizeKenyanPhone, normalizeReceipt, optionalEnv } from "./mpesa.ts";

type SupabaseClient = any;

type TillSubmissionRow = {
  id: string;
  member_id: string | null;
  phone: string;
  amount: number;
  mpesa_receipt: string;
  status: "pending" | "verified" | "rejected";
};

type VerificationEvidence = {
  source: "callback_audit" | "external_pull" | "existing_payment";
  checkoutRequestId: string | null;
  metadata: Record<string, unknown>;
};

export type VerifyTillOutcome = {
  submissionId: string;
  status: "verified" | "rejected";
  paymentId: string | null;
  reason: string;
  source: VerificationEvidence["source"] | "none";
};

function numberEquals(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.01;
}

function asNumber(input: unknown): number | null {
  if (input == null) return null;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeNormalizePhone(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  try {
    return normalizeKenyanPhone(String(value));
  } catch {
    return null;
  }
}

function payloadAmountAndPhone(payload: Record<string, any>): { amount: number | null; phone: string | null } {
  if (payload.TransAmount != null || payload.MSISDN != null) {
    return {
      amount: asNumber(payload.TransAmount),
      phone: safeNormalizePhone(payload.MSISDN),
    };
  }

  const items = payload?.Body?.stkCallback?.CallbackMetadata?.Item;
  if (Array.isArray(items)) {
    let amount: number | null = null;
    let phone: string | null = null;

    for (const item of items) {
      if (item?.Name === "Amount") {
        amount = asNumber(item?.Value);
      }
      if (item?.Name === "PhoneNumber" && item?.Value != null) {
        phone = safeNormalizePhone(item.Value);
      }
    }

    return { amount, phone };
  }

  return { amount: null, phone: null };
}

async function findCallbackEvidence(
  supabase: SupabaseClient,
  receipt: string,
  amount: number,
  phone: string,
): Promise<VerificationEvidence | null> {
  const { data, error } = await supabase
    .from("mpesa_callback_audit")
    .select("id, event_type, checkout_request_id, result_code, payload")
    .eq("mpesa_receipt", receipt)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new HttpError(500, "Failed to read callback audit logs", error);
  }

  for (const row of data ?? []) {
    const payload = (row.payload ?? {}) as Record<string, any>;
    const statusCode = Number(row.result_code ?? payload?.Body?.stkCallback?.ResultCode ?? payload?.ResultCode ?? 0);
    const success = statusCode === 0 || row.event_type === "c2b_confirmation";

    if (!success) {
      continue;
    }

    const extracted = payloadAmountAndPhone(payload);
    const amountMatches = extracted.amount == null ? true : numberEquals(extracted.amount, amount);
    const phoneMatches = extracted.phone == null ? true : extracted.phone === phone;

    if (amountMatches && phoneMatches) {
      return {
        source: "callback_audit",
        checkoutRequestId: row.checkout_request_id ?? null,
        metadata: {
          auditId: row.id,
          eventType: row.event_type,
        },
      };
    }
  }

  return null;
}

async function findExternalPullEvidence(
  receipt: string,
  amount: number,
  phone: string,
): Promise<VerificationEvidence | null> {
  const endpoint = optionalEnv("MPESA_PULL_VERIFICATION_URL");
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ receipt, amount, phone }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.matched !== true) {
      return null;
    }

    return {
      source: "external_pull",
      checkoutRequestId: payload.checkout_request_id ?? null,
      metadata: payload,
    };
  } catch (error) {
    console.error("MPESA_PULL_VERIFICATION_URL request failed", error);
    return null;
  }
}

export async function verifyTillSubmission(
  supabase: SupabaseClient,
  submission: TillSubmissionRow,
): Promise<VerifyTillOutcome> {
  const receipt = normalizeReceipt(submission.mpesa_receipt);
  const amount = Number(submission.amount);
  const phone = normalizeKenyanPhone(submission.phone);

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("mpesa_receipt", receipt)
    .maybeSingle();

  if (existingPaymentError) {
    throw new HttpError(500, "Failed to validate existing payments", existingPaymentError);
  }

  if (existingPayment?.id) {
    await supabase
      .from("till_submissions")
      .update({ status: "verified" })
      .eq("id", submission.id);

    await logCallbackAudit(supabase, {
      event_type: "verify_till",
      mpesa_receipt: receipt,
      payload: {
        submission_id: submission.id,
        reason: "receipt_already_linked_to_payment",
        payment_id: existingPayment.id,
      },
    });

    return {
      submissionId: submission.id,
      status: "verified",
      paymentId: existingPayment.id,
      reason: "Receipt already linked to an existing payment",
      source: "existing_payment",
    };
  }

  const evidence =
    (await findCallbackEvidence(supabase, receipt, amount, phone)) ??
    (await findExternalPullEvidence(receipt, amount, phone));

  if (!evidence) {
    const { error: submissionUpdateError } = await supabase
      .from("till_submissions")
      .update({ status: "rejected" })
      .eq("id", submission.id);

    if (submissionUpdateError) {
      throw new HttpError(500, "Failed to mark till submission as rejected", submissionUpdateError);
    }

    await logCallbackAudit(supabase, {
      event_type: "verify_till",
      mpesa_receipt: receipt,
      payload: {
        submission_id: submission.id,
        status: "rejected",
        reason: "receipt_not_found_in_callback_audit_or_pull_verifier",
      },
    });

    return {
      submissionId: submission.id,
      status: "rejected",
      paymentId: null,
      reason: "Receipt could not be verified from callback or pull data",
      source: "none",
    };
  }

  const paymentInsert = {
    member_id: submission.member_id,
    phone,
    amount,
    method: "till",
    checkout_request_id: evidence.checkoutRequestId,
    merchant_request_id: null,
    mpesa_receipt: receipt,
    status: "awaiting_approval",
    verified_at: new Date().toISOString(),
  };

  let paymentId: string | null = null;
  const { data: insertedPayment, error: insertPaymentError } = await supabase
    .from("payments")
    .insert(paymentInsert)
    .select("id")
    .single();

  if (insertPaymentError) {
    if (insertPaymentError.code === "23505") {
      const { data: duplicatePayment, error: duplicatePaymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("mpesa_receipt", receipt)
        .maybeSingle();

      if (duplicatePaymentError) {
        throw new HttpError(500, "Receipt replay check failed", duplicatePaymentError);
      }
      paymentId = duplicatePayment?.id ?? null;
    } else {
      throw new HttpError(500, "Failed to create payment record from till submission", insertPaymentError);
    }
  } else {
    paymentId = insertedPayment?.id ?? null;
  }

  const { error: submissionUpdateError } = await supabase
    .from("till_submissions")
    .update({ status: "verified" })
    .eq("id", submission.id);

  if (submissionUpdateError) {
    throw new HttpError(500, "Failed to mark till submission as verified", submissionUpdateError);
  }

  await logCallbackAudit(supabase, {
    event_type: "verify_till",
    checkout_request_id: evidence.checkoutRequestId,
    mpesa_receipt: receipt,
    payload: {
      submission_id: submission.id,
      status: "verified",
      source: evidence.source,
      payment_id: paymentId,
      evidence: evidence.metadata,
    },
  });

  return {
    submissionId: submission.id,
    status: "verified",
    paymentId,
    reason: "Receipt verified and queued for treasurer approval",
    source: evidence.source,
  };
}
