import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  REQUIRED_FINANCE_APPROVAL_ROLES,
  requireAuthenticatedUser,
  requireFinanceApprovalRole,
} from "../_shared/mpesa.ts";

type FinanceEntityType = "payment" | "refund" | "expenditure";
type ApprovePaymentRequest = {
  payment_id?: string;
  entity_id?: string;
  entity_type?: FinanceEntityType;
  decision: "approved" | "rejected";
  notes?: string;
};

const ENTITY_CONFIG: Record<
  FinanceEntityType,
  {
    table: string;
    pendingStatus: string;
    approvedStatus: string;
    rejectedStatus: string;
    selectColumns: string;
  }
> = {
  payment: {
    table: "payments",
    pendingStatus: "awaiting_approval",
    approvedStatus: "completed",
    rejectedStatus: "failed",
    selectColumns: "id, member_id, phone, amount, method, status, mpesa_receipt, verified_at, created_at",
  },
  refund: {
    table: "refund_requests",
    pendingStatus: "pending_approval",
    approvedStatus: "approved",
    rejectedStatus: "rejected",
    selectColumns:
      "id, member_id, contribution_id, contribution_type, original_amount, requested_amount, payout_amount, status, reason, created_at, resolved_at, rejection_reason",
  },
  expenditure: {
    table: "expenditures",
    pendingStatus: "pending_approval",
    approvedStatus: "approved",
    rejectedStatus: "rejected",
    selectColumns: "id, amount, category, description, payment_method, initiated_by, status, created_at, approved_at, rejection_reason",
  },
};

function parseEntity(body: ApprovePaymentRequest): { entityType: FinanceEntityType; entityId: string } {
  const entityType = (body.entity_type ?? "payment") as FinanceEntityType;
  if (!["payment", "refund", "expenditure"].includes(entityType)) {
    throw new HttpError(400, "entity_type must be payment, refund, or expenditure");
  }

  const entityId = (body.entity_id ?? body.payment_id ?? "").trim();
  if (!entityId) {
    throw new HttpError(400, "entity_id is required");
  }

  return { entityType, entityId };
}

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user, supabase } = await requireAuthenticatedUser(req);
    const { approvalRole } = await requireFinanceApprovalRole(supabase, user.id);

    const body = await readJsonBody<ApprovePaymentRequest>(req);
    const { entityType, entityId } = parseEntity(body);
    const decision = body.decision;
    const notes = body.notes?.trim() || null;

    if (decision !== "approved" && decision !== "rejected") {
      throw new HttpError(400, "decision must be approved or rejected");
    }

    const config = ENTITY_CONFIG[entityType];

    const { data: targetEntity, error: entityError } = await supabase
      .from(config.table)
      .select("id, status")
      .eq("id", entityId)
      .maybeSingle();

    if (entityError) {
      throw new HttpError(500, "Failed to load entity approval state", entityError);
    }

    if (!targetEntity?.id) {
      throw new HttpError(404, "Finance item not found");
    }

    if (targetEntity.status !== config.pendingStatus) {
      throw new HttpError(409, "Finance item is no longer awaiting approvals", {
        status: targetEntity.status,
        expected: config.pendingStatus,
      });
    }

    await supabase.rpc("ensure_finance_approvals", {
      _entity_type: entityType,
      _entity_id: entityId,
    });

    const { data: existingApproval, error: existingApprovalError } = await supabase
      .from("finance_approvals")
      .select("id, decision, required_role")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("required_role", approvalRole)
      .maybeSingle();

    if (existingApprovalError) {
      throw new HttpError(500, "Failed to check approval state", existingApprovalError);
    }

    if (!existingApproval?.id) {
      throw new HttpError(409, "Approval slot not found for your role", { role: approvalRole });
    }

    if (existingApproval.decision !== "pending") {
      throw new HttpError(409, "Your role has already submitted a decision", existingApproval);
    }

    const { data: updatedApproval, error: updateApprovalError } = await supabase
      .from("finance_approvals")
      .update({
        decision,
        approver_id: user.id,
        approver_role: approvalRole,
        notes,
        decided_at: new Date().toISOString(),
      })
      .eq("id", existingApproval.id)
      .select("id, entity_type, entity_id, required_role, approver_id, approver_role, decision, notes, decided_at, created_at")
      .single();

    if (updateApprovalError) {
      throw new HttpError(500, "Failed to save approval decision", updateApprovalError);
    }

    const { data: allApprovals, error: allApprovalsError } = await supabase
      .from("finance_approvals")
      .select("id, required_role, decision, approver_id, approver_role, decided_at, notes")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    if (allApprovalsError) {
      throw new HttpError(500, "Failed to load approval progress", allApprovalsError);
    }

    const approvals = allApprovals ?? [];
    const hasRejected = approvals.some((row) => row.decision === "rejected");
    const allApproved = REQUIRED_FINANCE_APPROVAL_ROLES.every((role) =>
      approvals.some((row) => row.required_role === role && row.decision === "approved")
    );

    const finalizeAsRejected = hasRejected;
    const finalizeAsApproved = !hasRejected && allApproved;

    if (finalizeAsRejected || finalizeAsApproved) {
      const updatePayload: Record<string, unknown> = {
        status: finalizeAsApproved ? config.approvedStatus : config.rejectedStatus,
      };

      if (entityType === "payment") {
        updatePayload.verified_at = finalizeAsApproved ? new Date().toISOString() : null;
      }

      if (entityType === "refund") {
        updatePayload.resolved_at = new Date().toISOString();
        updatePayload.resolved_by = user.id;
        updatePayload.rejection_reason = finalizeAsRejected ? notes ?? "Rejected by finance approver" : null;
      }

      if (entityType === "expenditure") {
        updatePayload.approved_at = finalizeAsApproved ? new Date().toISOString() : null;
        updatePayload.rejection_reason = finalizeAsRejected ? notes ?? "Rejected by finance approver" : null;
      }

      const { error: finalUpdateError } = await supabase
        .from(config.table)
        .update(updatePayload)
        .eq("id", entityId)
        .eq("status", config.pendingStatus);

      if (finalUpdateError) {
        throw new HttpError(500, "Failed to finalize finance item after approvals", finalUpdateError);
      }
    }

    const { data: refreshedEntity, error: refreshedEntityError } = await supabase
      .from(config.table)
      .select(config.selectColumns)
      .eq("id", entityId)
      .single();

    if (refreshedEntityError) {
      throw new HttpError(500, "Failed to load updated finance item", refreshedEntityError);
    }

    return jsonResponse({
      ok: true,
      entity_type: entityType,
      entity: refreshedEntity,
      approval: updatedApproval,
      approval_progress: {
        total_required: REQUIRED_FINANCE_APPROVAL_ROLES.length,
        approved_count: approvals.filter((row) => row.decision === "approved").length,
        rejected_count: approvals.filter((row) => row.decision === "rejected").length,
        pending_count: approvals.filter((row) => row.decision === "pending").length,
        approvals,
      },
    });
  } catch (error) {
    console.error("approve-payment failed", error);
    return errorResponse(error);
  }
});
