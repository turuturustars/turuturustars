import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  ensureMemberCanInteract,
  normalizeKenyanPhone,
  normalizeReceipt,
  parsePositiveAmount,
  requireAuthenticatedUser,
  validateFinanceAccess,
} from "../_shared/mpesa.ts";
import { verifyTillSubmission } from "../_shared/tillVerification.ts";

type TillSubmitRequest = {
  phone: string;
  amount: number;
  receipt: string;
  member_id?: string;
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
    const body = await readJsonBody<TillSubmitRequest>(req);

    const phone = normalizeKenyanPhone(body.phone ?? "");
    const amount = parsePositiveAmount(body.amount);
    const receipt = normalizeReceipt(body.receipt ?? "");

    let memberId = user.id;
    if (body.member_id && body.member_id !== user.id) {
      await validateFinanceAccess(supabase, user.id);
      memberId = body.member_id;
    } else {
      await ensureMemberCanInteract(supabase, user.id);
    }

    const { data: duplicateSubmission, error: duplicateCheckError } = await supabase
      .from("till_submissions")
      .select("id, status")
      .eq("mpesa_receipt", receipt)
      .maybeSingle();

    if (duplicateCheckError) {
      throw new HttpError(500, "Failed duplicate till receipt check", duplicateCheckError);
    }

    if (duplicateSubmission?.id) {
      throw new HttpError(409, "This M-Pesa receipt has already been submitted", {
        submission_id: duplicateSubmission.id,
        status: duplicateSubmission.status,
      });
    }

    const { data: submission, error: insertError } = await supabase
      .from("till_submissions")
      .insert({
        member_id: memberId,
        phone,
        amount,
        mpesa_receipt: receipt,
        status: "pending",
      })
      .select("id, member_id, phone, amount, mpesa_receipt, status")
      .single();

    if (insertError || !submission) {
      throw new HttpError(500, "Failed to create till submission", insertError);
    }

    const verification = await verifyTillSubmission(supabase, {
      ...submission,
      amount: Number(submission.amount),
      status: submission.status,
    });

    return jsonResponse({
      ok: true,
      submission,
      verification,
    });
  } catch (error) {
    console.error("till-submit failed", error);
    return errorResponse(error);
  }
});
