import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  requireAuthenticatedUser,
  validateTreasurerAccess,
} from "../_shared/mpesa.ts";

type ApprovePaymentRequest = {
  payment_id: string;
  decision: "approved" | "rejected";
  notes?: string;
};

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user, supabase } = await requireAuthenticatedUser(req);
    await validateTreasurerAccess(supabase, user.id);

    const body = await readJsonBody<ApprovePaymentRequest>(req);
    const paymentId = body.payment_id?.trim();
    const decision = body.decision;
    const notes = body.notes?.trim() || null;

    if (!paymentId) {
      throw new HttpError(400, "payment_id is required");
    }

    if (decision !== "approved" && decision !== "rejected") {
      throw new HttpError(400, "decision must be approved or rejected");
    }

    const { data: existingApproval, error: existingApprovalError } = await supabase
      .from("approvals")
      .select("id, decision, created_at")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existingApprovalError) {
      throw new HttpError(500, "Failed to check approval state", existingApprovalError);
    }

    if (existingApproval?.id) {
      throw new HttpError(409, "Payment already approved/rejected", existingApproval);
    }

    const newStatus = decision === "approved" ? "completed" : "failed";
    const { data: updatedPayment, error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        verified_at: decision === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", paymentId)
      .eq("status", "awaiting_approval")
      .select("id, member_id, phone, amount, method, status, mpesa_receipt, verified_at, created_at")
      .single();

    if (updateError) {
      throw new HttpError(409, "Payment is not awaiting approval or no longer exists", updateError);
    }

    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .insert({
        payment_id: paymentId,
        approver: user.id,
        decision,
        notes,
      })
      .select("id, payment_id, approver, decision, notes, created_at")
      .single();

    if (approvalError) {
      throw new HttpError(500, "Payment status updated but approval log insert failed", approvalError);
    }

    return jsonResponse({
      ok: true,
      payment: updatedPayment,
      approval,
    });
  } catch (error) {
    console.error("approve-payment failed", error);
    return errorResponse(error);
  }
});
