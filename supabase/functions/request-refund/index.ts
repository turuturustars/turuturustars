import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  ensureMemberCanInteract,
  parsePositiveAmount,
  requireAuthenticatedUser,
} from "../_shared/mpesa.ts";

type RequestRefundBody = {
  contribution_id?: string;
  requested_amount?: number;
  reason?: string;
};

const NON_REFUNDABLE_TYPES = new Set(["welfare", "registration", "membership_fee"]);
const PAYOUT_PERCENTAGE = 0.8;

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user, supabase } = await requireAuthenticatedUser(req);
    await ensureMemberCanInteract(supabase, user.id);

    const body = await readJsonBody<RequestRefundBody>(req);
    const contributionId = body.contribution_id?.trim();
    const reason = body.reason?.trim() || null;
    const requestedAmount = parsePositiveAmount(body.requested_amount);

    if (!contributionId) {
      throw new HttpError(400, "contribution_id is required");
    }

    const { data: contribution, error: contributionError } = await supabase
      .from("contributions")
      .select("id, member_id, amount, contribution_type, status")
      .eq("id", contributionId)
      .eq("member_id", user.id)
      .maybeSingle();

    if (contributionError) {
      throw new HttpError(500, "Failed to load contribution", contributionError);
    }

    if (!contribution?.id) {
      throw new HttpError(404, "Paid contribution not found for this member");
    }

    const contributionType = String(contribution.contribution_type || "").trim();
    if (NON_REFUNDABLE_TYPES.has(contributionType)) {
      throw new HttpError(400, `${contributionType} contributions are non-refundable`);
    }

    if (contribution.status !== "paid") {
      throw new HttpError(409, "Only paid contributions can be refunded", { status: contribution.status });
    }

    const originalAmount = Number(contribution.amount);
    if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
      throw new HttpError(409, "Contribution amount is invalid for refund");
    }

    if (requestedAmount > originalAmount) {
      throw new HttpError(400, "Requested refund cannot exceed paid amount", {
        requested_amount: requestedAmount,
        paid_amount: originalAmount,
      });
    }

    const { data: existingRequest, error: existingRequestError } = await supabase
      .from("refund_requests")
      .select("id, status")
      .eq("member_id", user.id)
      .eq("contribution_id", contributionId)
      .in("status", ["pending_approval", "approved"])
      .maybeSingle();

    if (existingRequestError) {
      throw new HttpError(500, "Failed to validate existing refund requests", existingRequestError);
    }

    if (existingRequest?.id) {
      throw new HttpError(409, "A refund request already exists for this contribution", existingRequest);
    }

    const payoutAmount = Number((requestedAmount * PAYOUT_PERCENTAGE).toFixed(2));

    const { data: refundRequest, error: insertError } = await supabase
      .from("refund_requests")
      .insert({
        member_id: user.id,
        contribution_id: contributionId,
        contribution_type: contributionType,
        original_amount: originalAmount,
        requested_amount: requestedAmount,
        payout_amount: payoutAmount,
        reason,
        status: "pending_approval",
        initiated_by: user.id,
      })
      .select(
        "id, member_id, contribution_id, contribution_type, original_amount, requested_amount, payout_amount, status, reason, created_at",
      )
      .single();

    if (insertError || !refundRequest) {
      throw new HttpError(500, "Failed to create refund request", insertError);
    }

    return jsonResponse({
      ok: true,
      refund_request: refundRequest,
      policy: {
        payout_percentage: 80,
        non_refundable_types: Array.from(NON_REFUNDABLE_TYPES),
      },
    });
  } catch (error) {
    console.error("request-refund failed", error);
    return errorResponse(error);
  }
});
