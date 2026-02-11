import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  getUserRoles,
  hasAnyRole,
  requireAuthenticatedUser,
} from "../_shared/mpesa.ts";
import { verifyTillSubmission } from "../_shared/tillVerification.ts";

type VerifyTillRequest = {
  submission_id: string;
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
    const body = await readJsonBody<VerifyTillRequest>(req);

    const submissionId = body.submission_id?.trim();
    if (!submissionId) {
      throw new HttpError(400, "submission_id is required");
    }

    const { data: submission, error: submissionError } = await supabase
      .from("till_submissions")
      .select("id, member_id, phone, amount, mpesa_receipt, status")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      throw new HttpError(500, "Failed to load till submission", submissionError);
    }

    if (!submission) {
      throw new HttpError(404, "Till submission not found");
    }

    const roles = await getUserRoles(supabase, user.id);
    const isFinanceOfficial = hasAnyRole(roles, ["admin", "treasurer", "chairperson"]);
    const isOwner = submission.member_id === user.id;

    if (!isFinanceOfficial && !isOwner) {
      throw new HttpError(403, "You can only verify your own till submission");
    }

    const outcome = await verifyTillSubmission(supabase, {
      ...submission,
      amount: Number(submission.amount),
      status: submission.status,
    });

    const payment = outcome.paymentId
      ? await supabase
          .from("payments")
          .select("id, amount, phone, method, status, mpesa_receipt, verified_at, created_at")
          .eq("id", outcome.paymentId)
          .maybeSingle()
      : { data: null, error: null };

    if (payment.error) {
      throw new HttpError(500, "Verification succeeded but payment lookup failed", payment.error);
    }

    return jsonResponse({
      ok: true,
      verification: outcome,
      payment: payment.data,
    });
  } catch (error) {
    console.error("verify-till failed", error);
    return errorResponse(error);
  }
});
