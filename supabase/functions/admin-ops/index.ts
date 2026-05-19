import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

type Action =
  | "log_action"
  | "create_member"
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

type AuthAdminError = { message: string };

type AuthAdminApi = {
  createUser: (attributes: {
    email: string;
    password: string;
    email_confirm?: boolean;
    phone?: string;
    user_metadata?: Record<string, unknown>;
  }) => Promise<{
    data: { user?: { id?: string } | null } | null;
    error: AuthAdminError | null;
  }>;
  deleteUser: (userId: string, shouldSoftDelete?: boolean) => Promise<{
    error: AuthAdminError | null;
  }>;
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new HttpError(500, "Member registration service is missing Supabase credentials");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAuthAdmin(supabase: ReturnType<typeof createClient>): AuthAdminApi {
  return supabase.auth.admin as unknown as AuthAdminApi;
}

function hasAnyRole(userRoles: string[], requiredRoles: readonly string[]): boolean {
  return userRoles.some((role) => requiredRoles.includes(role));
}

function normalizeKenyanPhone(rawPhone: string): string | null {
  const digits = rawPhone.trim().replace(/\D/g, "");
  if (/^0[17][0-9]{8}$/.test(digits)) {
    return `+254${digits.slice(1)}`;
  }
  if (/^254[17][0-9]{8}$/.test(digits)) {
    return `+${digits}`;
  }
  return null;
}

function isDuplicateAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("already") || lower.includes("registered") || lower.includes("duplicate");
}

function mapCreateUserError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email") && isDuplicateAuthError(message)) {
    return "A member already uses this email address. Search for the existing member or use a different email.";
  }
  if (lower.includes("phone") && isDuplicateAuthError(message)) {
    return "A member already uses this phone number. Search for the existing member or use a different phone.";
  }
  if (lower.includes("password")) {
    return "National ID must be at least 6 characters because it becomes the first password.";
  }
  if (isDuplicateAuthError(message)) {
    return "This member already has a login account. Check the email, phone, or National ID.";
  }
  return "Unable to create the member login account. Please check the details and try again.";
}

async function ensureNoExistingProfile(
  supabase: ReturnType<typeof createClient>,
  field: "email" | "phone" | "id_number",
  value: string | null,
  label: string,
): Promise<void> {
  if (!value) return;

  const query = supabase
    .from("profiles")
    .select("id, full_name, membership_number")
    .limit(1);
  const { data, error } = field === "email"
    ? await query.ilike(field, value)
    : await query.eq(field, value);

  if (error) {
    throw new HttpError(500, `Failed to check existing ${label}`, { detail: error.message });
  }

  const existing = Array.isArray(data) ? data[0] : null;
  if (existing) {
    const name = existing.full_name ? ` (${existing.full_name})` : "";
    const memberNumber = existing.membership_number ? `, ${existing.membership_number}` : "";
    throw new HttpError(409, `A member with this ${label} already exists${name}${memberNumber}.`);
  }
}

async function generateMembershipNumber(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabase.rpc("generate_membership_number");
  if (error) {
    console.warn("Failed to generate membership number", error.message);
    return null;
  }
  return typeof data === "string" && data.trim() ? data.trim() : null;
}

async function cleanupCreatedUser(supabase: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const { error } = await getAuthAdmin(supabase).deleteUser(userId, false);
  if (error) {
    console.warn("Failed to cleanup partially created member", { userId, error: error.message });
  }
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

  const { error: deleteError } = await getAuthAdmin(supabase).deleteUser(memberId, false);
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
    const supabase = createAdminClient();
    const actor = await getActor(supabase, token);

    const body = await req.json();
    const action: Action = body.action;

    if (!action) {
      throw new HttpError(400, "Missing action");
    }

    if (action === "create_member") {
      const fullName = (body.full_name as string | undefined)?.trim();
      const rawPhone = (body.phone as string | undefined)?.trim() || "";
      const phone = normalizeKenyanPhone(rawPhone);
      const email = (body.email as string | undefined)?.trim().toLowerCase() || null;
      const rawIdNumber =
        typeof body.id_number === "string"
          ? body.id_number
          : typeof body.idNumber === "string"
            ? body.idNumber
            : "";
      const idNumber = rawIdNumber.replace(/\s+/g, "").trim();
      const requestedPassword = (body.password as string | undefined)?.trim();
      const password = requestedPassword || idNumber;
      const status = (body.status as string | undefined) || "active";
      const isStudent = Boolean(body.is_student);
      const feePaid = Boolean(body.registration_fee_paid);

      if (!fullName || !rawPhone || !idNumber) {
        throw new HttpError(400, "Full name, phone, and National ID are required");
      }

      if (!phone) {
        throw new HttpError(400, "Enter a valid Kenyan mobile number, for example 07XXXXXXXX or +2547XXXXXXXX.");
      }

      if (email && !EMAIL_REGEX.test(email)) {
        throw new HttpError(400, "Enter a valid email address, or leave email blank.");
      }

      if (password.length < 6) {
        throw new HttpError(400, "National ID must be at least 6 characters to be used as the default password");
      }

      if (status !== "active" && status !== "pending") {
        throw new HttpError(400, "Member status must be Active or Pending.");
      }

      await ensureNoExistingProfile(supabase, "phone", phone, "phone number");
      await ensureNoExistingProfile(supabase, "id_number", idNumber, "National ID");
      await ensureNoExistingProfile(supabase, "email", email, "email address");

      // Synthesize an email if none provided so auth.admin.createUser works
      const effectiveEmail = email || `member-${Date.now()}-${Math.floor(Math.random() * 1000)}@turuturustars.local`;

      const { data: created, error: createErr } = await getAuthAdmin(supabase).createUser({
        email: effectiveEmail,
        password,
        email_confirm: true,
        phone,
        user_metadata: { full_name: fullName, phone, id_number: idNumber, created_by_admin: true },
      });

      if (createErr || !created?.user?.id) {
        const detail = createErr?.message ?? "no user returned";
        throw new HttpError(isDuplicateAuthError(detail) ? 409 : 500, mapCreateUserError(detail), { detail });
      }

      const newUserId = created.user.id as string;
      const now = new Date().toISOString();

      const { data: existingProfile, error: existingProfileErr } = await supabase
        .from("profiles")
        .select("membership_number, joined_at")
        .eq("id", newUserId)
        .maybeSingle();

      if (existingProfileErr) {
        await cleanupCreatedUser(supabase, newUserId);
        throw new HttpError(500, "Failed to prepare member profile", { detail: existingProfileErr.message });
      }

      const generatedMembershipNumber = existingProfile?.membership_number
        ? null
        : await generateMembershipNumber(supabase);
      const membershipNumber =
        (existingProfile?.membership_number as string | null | undefined) ??
        generatedMembershipNumber ??
        `TS-${Date.now()}`;

      const profilePayload: Record<string, unknown> = {
        id: newUserId,
        full_name: fullName,
        phone,
        email,
        id_number: idNumber,
        status,
        is_student: isStudent,
        registration_fee_paid: feePaid,
        updated_at: now,
        joined_at: (existingProfile?.joined_at as string | null | undefined) ?? now,
      };
      if (membershipNumber) {
        profilePayload.membership_number = membershipNumber;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profErr) {
        await cleanupCreatedUser(supabase, newUserId);
        throw new HttpError(500, "Failed to save member profile", { detail: profErr.message });
      }

      const { error: roleErr } = await supabase
        .from("user_roles")
        .upsert(
          {
            user_id: newUserId,
            role: "member",
            assigned_by: actor.id,
          },
          { onConflict: "user_id,role" },
        );

      if (roleErr) {
        await cleanupCreatedUser(supabase, newUserId);
        throw new HttpError(500, "Failed to assign member role", { detail: roleErr.message });
      }

      const { error: trackingErr } = await supabase
        .from("contribution_tracking")
        .upsert({ member_id: newUserId }, { onConflict: "member_id" });

      if (trackingErr) {
        console.warn("Failed to initialize contribution tracking", { userId: newUserId, error: trackingErr.message });
      }

      const { error: notificationPrefsErr } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: newUserId }, { onConflict: "user_id" });

      if (notificationPrefsErr) {
        console.warn("Failed to initialize notification preferences", {
          userId: newUserId,
          error: notificationPrefsErr.message,
        });
      }

      const { data: profile, error: readProfileErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, id_number, membership_number, status, is_student, registration_fee_paid, joined_at")
        .eq("id", newUserId)
        .maybeSingle();

      if (readProfileErr || !profile) {
        await cleanupCreatedUser(supabase, newUserId);
        throw new HttpError(500, "Member account was created but profile could not be loaded", {
          detail: readProfileErr?.message ?? "no profile returned",
        });
      }

      await logAdminAction(supabase, actor.id, actor.primaryRole, "member_created", "member", newUserId, {
        full_name: fullName,
        email: email ?? null,
        phone,
      });

      return new Response(JSON.stringify({ ok: true, member: profile, user_id: newUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

      const deleteAccount = body.delete_account === true;
      const forceDelete = body.force === true;

      if (deleteAccount) {
        await permanentlyDeleteMember(supabase, actor, memberId, body.confirmation, forceDelete);
      }

      await logAdminAction(supabase, actor.id, actor.primaryRole, "member_rejected", "member", memberId, {
        reason,
        delete_account: deleteAccount,
        force: forceDelete,
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
