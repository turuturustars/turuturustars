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
  payment_method?: "manual" | "automatic" | "cash" | "bank" | "mpesa" | "wallet";
  expense_date?: string;
  payee?: string;
  reference_number?: string;
  receipt_url?: string;
  fund?: string;
  account_code?: string;
  notes?: string;
};

const PAYMENT_METHODS = new Set(["manual", "automatic", "cash", "bank", "mpesa", "wallet"]);

function parseExpenseDate(value: string | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new HttpError(400, "expense_date must be a valid date");
  }

  return parsed.toISOString().slice(0, 10);
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
    const roles = await getUserRoles(supabase, user.id);
    if (!roles.includes("treasurer") && !roles.includes("admin")) {
      throw new HttpError(403, "Only the treasurer or admin can record expenditures", { roles });
    }

    const body = await readJsonBody<RecordExpenditureBody>(req);
    const amount = parsePositiveAmount(body.amount);
    const category = body.category?.trim();
    const description = body.description?.trim();
    const paymentMethod = PAYMENT_METHODS.has(String(body.payment_method))
      ? String(body.payment_method)
      : "manual";
    const expenseDate = parseExpenseDate(body.expense_date);
    const payee = body.payee?.trim() || null;
    const referenceNumber = body.reference_number?.trim() || null;
    const receiptUrl = body.receipt_url?.trim() || null;
    const fund = body.fund?.trim() || "general";
    const accountCode = body.account_code?.trim() || null;
    const notes = body.notes?.trim() || null;

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
        expense_date: expenseDate,
        payee,
        reference_number: referenceNumber,
        receipt_url: receiptUrl,
        fund,
        account_code: accountCode,
        notes,
        initiated_by: user.id,
        status: "pending_approval",
      })
      .select("id, amount, category, description, payment_method, expense_date, payee, reference_number, receipt_url, fund, account_code, notes, initiated_by, status, created_at")
      .single();

    if (insertError || !expenditure) {
      throw new HttpError(500, "Failed to record expenditure", insertError);
    }

    return jsonResponse({
      ok: true,
      expenditure,
      governance: {
        initiated_by: "treasurer_or_admin",
        can_initiate_roles: ["treasurer", "admin"],
        required_approvals: ["chairperson", "admin", "secretary", "patron"],
      },
    });
  } catch (error) {
    console.error("record-expenditure failed", error);
    return errorResponse(error);
  }
});
