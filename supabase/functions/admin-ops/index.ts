import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

type Action =
  | "log_action"
  | "delete_member"
  | "approve_user"
  | "approve_payment";

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
  "vice_chairperson",
  "treasurer",
  "secretary",
  "coordinator",
  "patron",
] as const;

function ensureElevated(role?: string | null) {
  if (!role || !ELEVATED_ROLES.includes(role as (typeof ELEVATED_ROLES)[number])) {
    throw new Error("Insufficient permissions");
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
): Promise<{ id: string; role: string; name?: string; email?: string }> {
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    throw new Error("Unauthorized");
  }
  const userId = authData.user.id;
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role, user_name, user_email")
    .eq("user_id", userId)
    .limit(1);
  if (roleError || !roles?.length) throw new Error("Unauthorized");
  const role = roles[0].role as string;
  ensureElevated(role);
  return { id: userId, role, name: roles[0].user_name ?? undefined, email: roles[0].user_email ?? undefined };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const actor = await getActor(supabase, token);

    const body = await req.json();
    const action: Action = body.action;

    if (!action) throw new Error("Missing action");

    if (action === "log_action") {
      await logAdminAction(
        supabase,
        actor.id,
        actor.role,
        body.event || "custom",
        body.entity_type || "custom",
        body.entity_id || null,
        body.details || null,
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (action === "delete_member") {
      const memberId: string | undefined = body.member_id;
      const confirmation: string | undefined = body.confirmation;
      if (!memberId) throw new Error("Missing member_id");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, membership_number, full_name, email, phone, soft_deleted")
        .eq("id", memberId)
        .maybeSingle();
      if (profileError || !profile) throw new Error("Member not found");
      if (!confirmation || confirmation !== `DELETE ${profile.membership_number ?? profile.id}`) {
        throw new Error("Confirmation text mismatch");
      }

      // Soft-delete profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          soft_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: actor.id,
          status: "suspended",
        })
        .eq("id", memberId);
      if (updateError) throw new Error(updateError.message);

      // Disable auth user (best-effort)
      await supabase.auth.admin.deleteUser(memberId);

      await logAdminAction(supabase, actor.id, actor.role, "member_deleted", "member", memberId, {
        membership_number: profile.membership_number,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
      });

      return new Response(JSON.stringify({ ok: true, deleted: memberId }), { headers: corsHeaders });
    }

    if (action === "approve_user") {
      const targetUserId: string | undefined = body.user_id;
      if (!targetUserId) throw new Error("Missing user_id");
      // Example: set profile status to active
      await supabase.from("profiles").update({ status: "active" }).eq("id", targetUserId);
      await logAdminAction(supabase, actor.id, actor.role, "user_approved", "user", targetUserId, null);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (action === "approve_payment") {
      const paymentId: string | undefined = body.payment_id;
      if (!paymentId) throw new Error("Missing payment_id");
      // Placeholder: mark payment as approved if such table exists
      await logAdminAction(supabase, actor.id, actor.role, "payment_approved", "payment", paymentId, null);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
