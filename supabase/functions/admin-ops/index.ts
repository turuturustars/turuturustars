import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

type Action =
  | "log_action"
  | "delete_member"
  | "suspend_member"
  | "reject_member"
  | "approve_user"
  | "approve_payment"
  | "assign_official_role";

type MemberLifecycleMode = "suspend" | "permanent";

type MemberProfile = {
  id: string;
  membership_number: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_number?: string | null;
  status: string | null;
  registration_fee_paid?: boolean | null;
  registration_completed_at?: string | null;
  soft_deleted?: boolean | null;
};

type Actor = {
  id: string;
  roles: string[];
  primaryRole: string;
  name?: string;
  email?: string;
};

class HttpError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ELEVATED_ROLES = [
  "admin",
  "chairperson",
  "vice_chairman",
  "secretary",
  "vice_secretary",
  "treasurer",
  "organizing_secretary",
  "coordinator",
  "patron",
] as const;

const OFFICIAL_ROLES = [
  "admin",
  "chairperson",
  "vice_chairman",
  "secretary",
  "vice_secretary",
  "treasurer",
  "organizing_secretary",
  "coordinator",
  "patron",
  "committee_member",
] as const;

const IGNORED_CLEANUP_ERROR_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);
const ASSIGNABLE_OFFICIAL_ROLES = new Set([
  "admin",
  "chairperson",
  "vice_chairman",
  "secretary",
  "vice_secretary",
  "treasurer",
  "organizing_secretary",
  "coordinator",
  "committee_member",
  "patron",
]);

function hasAnyRole(userRoles: string[], requiredRoles: readonly string[]): boolean {
  return userRoles.some((role) => requiredRoles.includes(role));
}

function ensureElevated(roles: string[]): void {
  if (!hasAnyRole(roles, ELEVATED_ROLES)) {
    throw new HttpError(403, "Insufficient permissions");
  }
}

function ensureAdmin(roles: string[]): void {
  if (!roles.includes("admin")) {
    throw new HttpError(403, "Only admins can permanently delete members");
  }
}

function ensureAdminOrChairperson(roles: string[]): void {
  if (!roles.includes("admin") && !roles.includes("chairperson")) {
    throw new HttpError(403, "Only admin or chairperson can assign official roles");
  }
}

function requireConfirmation(profile: MemberProfile, confirmation?: string): void {
  const expected = `DELETE ${(profile.membership_number || profile.id).toUpperCase()}`;
  const normalized = (confirmation || "").trim().toUpperCase();
  if (normalized !== expected) {
    throw new HttpError(400, "Confirmation text mismatch", { expected });
  }
}

async function logAdminAction(
  supabase: ReturnType<typeof createClient>,
  actorId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> | null,
) {
  await supabase.from("admin_audit_log").insert({
    actor_id: actorId,
    actor_role: actorRole,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

async function getActor(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<Actor> {
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const userId = authData.user.id;
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roleError) {
    throw new HttpError(500, "Failed to resolve roles", { detail: roleError.message });
  }

  if (!roles?.length) {
    throw new HttpError(403, "No roles assigned");
  }

  const roleList = roles.map((row) => row.role as string);
  ensureElevated(roleList);

  return {
    id: userId,
    roles: roleList,
    primaryRole: roleList[0] ?? "member",
    name: (authData.user.user_metadata?.full_name as string | undefined) ?? undefined,
    email: authData.user.email ?? undefined,
  };
}

async function fetchMemberProfile(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
): Promise<MemberProfile> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, membership_number, full_name, email, phone, id_number, status, registration_fee_paid, registration_completed_at, soft_deleted")
    .eq("id", memberId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new HttpError(404, "Member not found");
  }

  return profile as MemberProfile;
}

function ensureEligibleForOfficialRole(profile: MemberProfile): void {
  if (profile.status !== "active") {
    throw new HttpError(400, "Member must be active before assigning an official role");
  }

  if (!profile.registration_fee_paid) {
    throw new HttpError(400, "Member must have paid the registration membership fee");
  }

  if (!profile.membership_number) {
    throw new HttpError(400, "Member must have a membership number");
  }

  if (!profile.full_name || !profile.phone || !profile.id_number) {
    throw new HttpError(400, "Member must be fully registered before role assignment");
  }
}

async function notifyMember(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  message: string,
  type = "membership_update",
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("Failed to notify member", { userId, error: error.message });
  }
}

async function suspendMemberProfile(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
  actorId: string,
  options: { purgeSensitive: boolean },
): Promise<void> {
  const payload: Record<string, unknown> = {
    status: "suspended",
    updated_at: new Date().toISOString(),
  };

  if (options.purgeSensitive) {
    payload.soft_deleted = true;
    payload.deleted_at = new Date().toISOString();
    payload.deleted_by = actorId;
    payload.membership_number = null;
    payload.id_number = null;
    payload.email = null;
    payload.location = null;
    payload.occupation = null;
    payload.full_name = "Rejected Member";
    payload.phone = `REJECTED-${memberId.slice(0, 8)}`;
  } else {
    payload.soft_deleted = false;
    payload.deleted_at = null;
    payload.deleted_by = null;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", memberId);

  if (updateError) {
    throw new HttpError(500, "Failed to update member status", { detail: updateError.message });
  }

  if (options.purgeSensitive) {
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", memberId)
      .neq("role", "member");
  }
}

function isIgnorableCleanupError(error: unknown): boolean {
  const maybeError = error as { code?: string | null; message?: string | null } | null;
  const code = maybeError?.code ?? "";
  const message = `${maybeError?.message ?? ""}`.toLowerCase();

  if (code && IGNORED_CLEANUP_ERROR_CODES.has(code)) {
    return true;
  }

  return (
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

async function runCleanupStep(
  step: string,
  operation: () => Promise<{ error: { code?: string | null; message?: string | null } | null }>,
): Promise<void> {
  const { error } = await operation();
  if (!error || isIgnorableCleanupError(error)) {
    return;
  }

  throw new HttpError(500, "Failed to cleanup member data for hard delete", {
    step,
    code: error.code ?? null,
    detail: error.message ?? null,
  });
}

async function cleanupMemberReferences(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
): Promise<void> {
  // Purge direct member-owned records first.
  await runCleanupStep("approvals:approver", () =>
    supabase.from("approvals").delete().eq("approver", memberId));
  await runCleanupStep("payments:member_id", () =>
    supabase.from("payments").delete().eq("member_id", memberId));
  await runCleanupStep("till_submissions:member_id", () =>
    supabase.from("till_submissions").delete().eq("member_id", memberId));
  await runCleanupStep("pesapal_transactions:member_id", () =>
    supabase.from("pesapal_transactions").delete().eq("member_id", memberId));
  await runCleanupStep("mpesa_transactions:member_id", () =>
    supabase.from("mpesa_transactions").delete().eq("member_id", memberId));
  await runCleanupStep("mpesa_standing_orders:member_id", () =>
    supabase.from("mpesa_standing_orders").delete().eq("member_id", memberId));
  await runCleanupStep("welfare_transactions:recorded_by_id", () =>
    supabase.from("welfare_transactions").delete().eq("recorded_by_id", memberId));
  await runCleanupStep("discipline_records:member_id", () =>
    supabase.from("discipline_records").delete().eq("member_id", memberId));
  await runCleanupStep("meeting_attendance:member_id", () =>
    supabase.from("meeting_attendance").delete().eq("member_id", memberId));
  await runCleanupStep("membership_fee_contributions:member_id", () =>
    supabase.from("membership_fee_contributions").delete().eq("member_id", memberId));
  await runCleanupStep("notification_preferences:user_id", () =>
    supabase.from("notification_preferences").delete().eq("user_id", memberId));
  await runCleanupStep("notifications:user_id", () =>
    supabase.from("notifications").delete().eq("user_id", memberId));
  await runCleanupStep("contributions:member_id", () =>
    supabase.from("contributions").delete().eq("member_id", memberId));
  await runCleanupStep("contribution_tracking:member_id", () =>
    supabase.from("contribution_tracking").delete().eq("member_id", memberId));

  // Null-out optional foreign keys that may still point to this user.
  await runCleanupStep("user_roles:assigned_by", () =>
    supabase.from("user_roles").update({ assigned_by: null }).eq("assigned_by", memberId));
  await runCleanupStep("welfare_cases:created_by", () =>
    supabase.from("welfare_cases").update({ created_by: null }).eq("created_by", memberId));
  await runCleanupStep("welfare_cases:beneficiary_id", () =>
    supabase.from("welfare_cases").update({ beneficiary_id: null }).eq("beneficiary_id", memberId));
  await runCleanupStep("announcements:created_by", () =>
    supabase.from("announcements").update({ created_by: null }).eq("created_by", memberId));
  await runCleanupStep("admin_audit_log:actor_id", () =>
    supabase.from("admin_audit_log").update({ actor_id: null }).eq("actor_id", memberId));
  await runCleanupStep("profiles:deleted_by", () =>
    supabase.from("profiles").update({ deleted_by: null }).eq("deleted_by", memberId));
  await runCleanupStep("pesapal_transactions:initiated_by", () =>
    supabase.from("pesapal_transactions").update({ initiated_by: null }).eq("initiated_by", memberId));

  // Remove role assignments owned by this member before deleting auth user.
  await runCleanupStep("user_roles:user_id", () =>
    supabase.from("user_roles").delete().eq("user_id", memberId));
}

async function permanentlyDeleteMember(
  supabase: ReturnType<typeof createClient>,
  actor: Actor,
  memberId: string,
  confirmation?: string,
  force = false,
): Promise<MemberProfile> {
  ensureAdmin(actor.roles);

  if (actor.id === memberId) {
    throw new HttpError(409, "You cannot permanently delete your own account");
  }

  const profile = await fetchMemberProfile(supabase, memberId);
  requireConfirmation(profile, confirmation);

  const { data: memberRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", memberId);

  if (rolesError) {
    throw new HttpError(500, "Failed to read member roles", { detail: rolesError.message });
  }

  const roleList = (memberRoles ?? []).map((row) => row.role as string);
  const isOfficial = hasAnyRole(roleList, OFFICIAL_ROLES);

  if (isOfficial && !force) {
    throw new HttpError(
      409,
      "This member has official roles. Suspend first, then retry with force if you still need permanent delete.",
    );
  }

  await cleanupMemberReferences(supabase, memberId);

  const { error: deleteError } = await (supabase.auth.admin as any).deleteUser(memberId, false);
  if (deleteError) {
    throw new HttpError(500, "Failed to permanently delete member", {
      detail: deleteError.message,
    });
  }

  // Defensive cleanup in case auth deletion cannot cascade into profiles.
  await runCleanupStep("profiles:id", () =>
    supabase.from("profiles").delete().eq("id", memberId));

  return profile;
}

async function assignOfficialRole(
  supabase: ReturnType<typeof createClient>,
  actor: Actor,
  targetUserId: string,
  role: string,
): Promise<void> {
  ensureAdminOrChairperson(actor.roles);

  if (!ASSIGNABLE_OFFICIAL_ROLES.has(role)) {
    throw new HttpError(400, "Invalid role for official assignment");
  }

  const profile = await fetchMemberProfile(supabase, targetUserId);
  ensureEligibleForOfficialRole(profile);

  const { error: ensureMemberRoleError } = await supabase
    .from("user_roles")
    .upsert(
      {
        user_id: targetUserId,
        role: "member",
        assigned_by: actor.id,
      },
      { onConflict: "user_id,role" },
    );

  if (ensureMemberRoleError) {
    throw new HttpError(500, "Failed to ensure base member role", {
      detail: ensureMemberRoleError.message,
    });
  }

  const { error: clearError } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", targetUserId)
    .neq("role", "member");

  if (clearError) {
    throw new HttpError(500, "Failed to clear previous official roles", {
      detail: clearError.message,
    });
  }

  const { error: assignError } = await supabase
    .from("user_roles")
    .insert({
      user_id: targetUserId,
      role,
      assigned_by: actor.id,
    });

  if (assignError) {
    throw new HttpError(500, "Failed to assign official role", {
      detail: assignError.message,
    });
  }
}

function parseLifecycleMode(action: Action, value: unknown): MemberLifecycleMode {
  if (action === "suspend_member") {
    return "suspend";
  }

  if (value === "permanent") {
    return "permanent";
  }

  if (action === "delete_member") {
    return "permanent";
  }

  return "suspend";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new HttpError(401, "Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const actor = await getActor(supabase, token);

    const body = await req.json();
    const action: Action = body.action;

    if (!action) {
      throw new HttpError(400, "Missing action");
    }

    if (action === "log_action") {
      await logAdminAction(
        supabase,
        actor.id,
        actor.primaryRole,
        body.event || "custom",
        body.entity_type || "custom",
        body.entity_id || null,
        body.details || null,
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "suspend_member" || action === "delete_member") {
      const memberId: string | undefined = body.member_id;
      if (!memberId) {
        throw new HttpError(400, "Missing member_id");
      }

      const mode = parseLifecycleMode(action, body.mode);
      if (mode === "permanent") {
        const profile = await permanentlyDeleteMember(
          supabase,
          actor,
          memberId,
          body.confirmation,
          Boolean(body.force),
        );

        await logAdminAction(supabase, actor.id, actor.primaryRole, "member_permanently_deleted", "member", memberId, {
          full_name: profile.full_name,
          membership_number: profile.membership_number,
          email: profile.email,
          phone: profile.phone,
          force: Boolean(body.force),
        });

        return new Response(JSON.stringify({ ok: true, deleted: memberId, mode }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await suspendMemberProfile(supabase, memberId, actor.id, { purgeSensitive: false });

      await notifyMember(
        supabase,
        memberId,
        "Membership Suspended",
        body.reason || "Your account has been suspended by the admin office. Contact officials for review.",
        "membership_suspended",
      );

      await logAdminAction(supabase, actor.id, actor.primaryRole, "member_suspended", "member", memberId, {
        reason: body.reason ?? null,
      });

      return new Response(JSON.stringify({ ok: true, member_id: memberId, mode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject_member") {
      const memberId: string | undefined = body.member_id;
      if (!memberId) {
        throw new HttpError(400, "Missing member_id");
      }

      const reason = typeof body.reason === "string" && body.reason.trim().length > 0
        ? body.reason.trim()
        : "Your membership application was not approved.";

      await suspendMemberProfile(supabase, memberId, actor.id, { purgeSensitive: true });

      await notifyMember(
        supabase,
        memberId,
        "Membership Application Rejected",
        `${reason} Your assigned member number and profile details have been removed.`,
        "membership_rejected",
      );

      if (Boolean(body.delete_account)) {
        await permanentlyDeleteMember(supabase, actor, memberId, body.confirmation, Boolean(body.force));
      }

      await logAdminAction(supabase, actor.id, actor.primaryRole, "member_rejected", "member", memberId, {
        reason,
        delete_account: Boolean(body.delete_account),
        force: Boolean(body.force),
      });

      return new Response(JSON.stringify({ ok: true, member_id: memberId, rejected: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve_user") {
      const targetUserId: string | undefined = body.user_id;
      if (!targetUserId) {
        throw new HttpError(400, "Missing user_id");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "active",
          soft_deleted: false,
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId);

      if (error) {
        throw new HttpError(500, "Failed to approve user", { detail: error.message });
      }

      await notifyMember(
        supabase,
        targetUserId,
        "Membership Approved",
        "Your membership has been approved. You now have full access.",
        "approval",
      );

      await logAdminAction(supabase, actor.id, actor.primaryRole, "user_approved", "user", targetUserId, null);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve_payment") {
      const paymentId: string | undefined = body.payment_id;
      if (!paymentId) {
        throw new HttpError(400, "Missing payment_id");
      }

      await logAdminAction(supabase, actor.id, actor.primaryRole, "payment_approved", "payment", paymentId, null);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "assign_official_role") {
      const targetUserId: string | undefined = body.user_id;
      const role: string | undefined = body.role;

      if (!targetUserId || !role) {
        throw new HttpError(400, "Missing user_id or role");
      }

      await assignOfficialRole(supabase, actor, targetUserId, role);

      await notifyMember(
        supabase,
        targetUserId,
        "Official Role Assigned",
        `You have been assigned the ${role.replace(/_/g, " ")} role.`,
        "role_assignment",
      );

      await logAdminAction(
        supabase,
        actor.id,
        actor.primaryRole,
        "official_role_assigned",
        "user_role",
        targetUserId,
        { assigned_role: role },
      );

      return new Response(JSON.stringify({ ok: true, user_id: targetUserId, role }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new HttpError(400, `Unknown action: ${action}`);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 400;
    const message = error instanceof Error ? error.message : String(error);
    const details = error instanceof HttpError ? error.details : null;

    return new Response(JSON.stringify({ error: message, details }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
