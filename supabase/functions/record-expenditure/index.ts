import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HttpError, corsHeaders, errorResponse, isOptionsRequest, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  getUserRoles,
  parsePositiveAmount,
  requireAuthenticatedUser,
} from "../_shared/mpesa.ts";

type RecordExpenditureBody = {
  amount?: number;
  category?: string;
  description?: string;
  payment_method?: "manual" | "automatic";
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
    const roles = await getUserRoles(supabase, user.id);
    if (!roles.includes("treasurer")) {
      throw new HttpError(403, "Only the treasurer can record expenditures", { roles });
    }

    const body = await readJsonBody<RecordExpenditureBody>(req);
    const amount = parsePositiveAmount(body.amount);
    const category = body.category?.trim();
    const description = body.description?.trim();
    const paymentMethod = body.payment_method === "automatic" ? "automatic" : "manual";

    if (!category) {
      throw new HttpError(400, "category is required");
    }

    if (!description) {
      throw new HttpError(400, "description is required");
    }

    const { data: expenditure, error: insertError } = await supabase
      .from("expenditures")
      .insert({
        amount,
        category,
        description,
        payment_method: paymentMethod,
        initiated_by: user.id,
        status: "pending_approval",
      })
      .select("id, amount, category, description, payment_method, initiated_by, status, created_at")
      .single();

    if (insertError || !expenditure) {
      throw new HttpError(500, "Failed to record expenditure", insertError);
    }

    return jsonResponse({
      ok: true,
      expenditure,
      governance: {
        initiated_by: "treasurer",
        required_approvals: ["chairperson", "admin", "secretary", "patron"],
      },
    });
  } catch (error) {
    console.error("record-expenditure failed", error);
    return errorResponse(error);
  }
});
