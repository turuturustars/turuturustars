import { supabase } from '@/integrations/supabase/client';

export type CboPaymentStatus = 'pending' | 'completed' | 'failed' | 'awaiting_approval';
export type CboPaymentMethod = 'stk' | 'till';
export type FinanceEntityType = 'payment' | 'refund' | 'expenditure';
export type FinanceApprovalRole = 'chairperson' | 'admin' | 'secretary' | 'patron';

export const REQUIRED_APPROVAL_ROLES: FinanceApprovalRole[] = ['chairperson', 'admin', 'secretary', 'patron'];

export interface CboPayment {
  id: string;
  member_id: string | null;
  phone: string;
  amount: number;
  method: CboPaymentMethod;
  checkout_request_id: string | null;
  merchant_request_id: string | null;
  mpesa_receipt: string | null;
  status: CboPaymentStatus;
  verified_at: string | null;
  created_at: string;
}

export interface CboRefundRequest {
  id: string;
  member_id: string;
  contribution_id: string;
  contribution_type: string;
  original_amount: number;
  requested_amount: number;
  payout_amount: number;
  reason: string | null;
  status: 'pending_approval' | 'approved' | 'rejected' | 'paid';
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface CboExpenditure {
  id: string;
  amount: number;
  category: string;
  description: string;
  payment_method: 'manual' | 'automatic';
  initiated_by: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface FinanceApproval {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  required_role: FinanceApprovalRole;
  decision: 'pending' | 'approved' | 'rejected';
  approver_id: string | null;
  approver_role: string | null;
  notes: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface TillSubmission {
  id: string;
  member_id: string | null;
  phone: string;
  amount: number;
  mpesa_receipt: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export interface InitiateStkPushInput {
  phone: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
}

export interface InitiateStkPushResult {
  payment_id: string | null;
  checkout_request_id: string;
  merchant_request_id: string;
  customer_message: string;
  response_description: string;
  status: 'pending';
}

export interface TillSubmitInput {
  phone: string;
  amount: number;
  receipt: string;
}

export interface TillSubmitResult {
  submission: TillSubmission;
  verification: {
    submissionId: string;
    status: 'verified' | 'rejected';
    paymentId: string | null;
    reason: string;
    source: 'callback_audit' | 'external_pull' | 'existing_payment' | 'none';
  };
}

export interface ApprovalDecisionInput {
  paymentId?: string;
  entityId?: string;
  entityType?: FinanceEntityType;
  decision: 'approved' | 'rejected';
  notes?: string;
}

export interface RequestRefundInput {
  contributionId: string;
  requestedAmount: number;
  reason?: string;
}

export interface RecordExpenditureInput {
  amount: number;
  category: string;
  description: string;
  paymentMethod?: 'manual' | 'automatic';
}

export interface RefundableContribution {
  id: string;
  amount: number;
  contribution_type: string;
  status: string | null;
  created_at: string | null;
  reference_number: string | null;
}

function parseFunctionError(error: unknown, fallbackMessage: string): Error {
  if (!error) return new Error(fallbackMessage);
  if (error instanceof Error) return error;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message);
    return new Error(message || fallbackMessage);
  }
  return new Error(fallbackMessage);
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function initiateStkPushPayment(input: InitiateStkPushInput): Promise<InitiateStkPushResult> {
  const { data, error } = await supabase.functions.invoke('stk-push', {
    body: {
      phone: input.phone,
      amount: input.amount,
      accountReference: input.accountReference,
      transactionDesc: input.transactionDesc,
    },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to initiate STK push');
  }

  return {
    payment_id: data.payment_id ?? null,
    checkout_request_id: data.checkout_request_id,
    merchant_request_id: data.merchant_request_id,
    customer_message: data.customer_message,
    response_description: data.response_description,
    status: 'pending',
  };
}

export async function submitTillPayment(input: TillSubmitInput): Promise<TillSubmitResult> {
  const { data, error } = await supabase.functions.invoke('till-submit', {
    body: {
      phone: input.phone,
      amount: input.amount,
      receipt: input.receipt,
    },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to submit till payment');
  }

  return data as TillSubmitResult;
}

export async function verifyTillSubmission(submissionId: string) {
  const { data, error } = await supabase.functions.invoke('verify-till', {
    body: { submission_id: submissionId },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to verify till submission');
  }

  return data;
}

export async function approvePaymentDecision(input: ApprovalDecisionInput) {
  const entityType = input.entityType ?? 'payment';
  const entityId = input.entityId ?? input.paymentId;
  if (!entityId) {
    throw new Error('entityId (or paymentId) is required');
  }

  const { data, error } = await supabase.functions.invoke('approve-payment', {
    body: {
      payment_id: input.paymentId,
      entity_id: entityId,
      entity_type: entityType,
      decision: input.decision,
      notes: input.notes,
    },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to submit approval decision');
  }

  return data;
}

export async function requestRefund(input: RequestRefundInput) {
  const { data, error } = await supabase.functions.invoke('request-refund', {
    body: {
      contribution_id: input.contributionId,
      requested_amount: input.requestedAmount,
      reason: input.reason,
    },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to submit refund request');
  }

  return data;
}

export async function recordExpenditure(input: RecordExpenditureInput) {
  const { data, error } = await supabase.functions.invoke('record-expenditure', {
    body: {
      amount: input.amount,
      category: input.category,
      description: input.description,
      payment_method: input.paymentMethod ?? 'manual',
    },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to record expenditure');
  }

  return data;
}

export async function fetchPaymentsForMember(memberId: string, limit = 25): Promise<CboPayment[]> {
  const { data, error } = await (supabase as any)
    .from('payments')
    .select('id, member_id, phone, amount, method, checkout_request_id, merchant_request_id, mpesa_receipt, status, verified_at, created_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch payments');
  return (data ?? []).map((row: any) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function fetchPaymentByCheckoutId(checkoutRequestId: string): Promise<CboPayment | null> {
  const { data, error } = await (supabase as any)
    .from('payments')
    .select('id, member_id, phone, amount, method, checkout_request_id, merchant_request_id, mpesa_receipt, status, verified_at, created_at')
    .eq('checkout_request_id', checkoutRequestId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to fetch payment status');
  if (!data) return null;

  return { ...data, amount: toNumber(data.amount) };
}

export async function fetchAwaitingApprovalPayments(limit = 100): Promise<CboPayment[]> {
  const { data, error } = await (supabase as any)
    .from('payments')
    .select('id, member_id, phone, amount, method, checkout_request_id, merchant_request_id, mpesa_receipt, status, verified_at, created_at')
    .eq('status', 'awaiting_approval')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch awaiting approvals');
  return (data ?? []).map((row: any) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function fetchFinancePayments(limit = 200): Promise<CboPayment[]> {
  const { data, error } = await (supabase as any)
    .from('payments')
    .select('id, member_id, phone, amount, method, checkout_request_id, merchant_request_id, mpesa_receipt, status, verified_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch payment records');
  return (data ?? []).map((row: any) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function fetchRefundableContributionsForMember(memberId: string, limit = 100): Promise<RefundableContribution[]> {
  const { data, error } = await (supabase as any)
    .from('contributions')
    .select('id, amount, contribution_type, status, created_at, reference_number')
    .eq('member_id', memberId)
    .eq('status', 'paid')
    .not('contribution_type', 'in', '(welfare,registration,membership_fee)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch refundable contributions');
  return (data ?? []).map((row: any) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function fetchRefundRequestsForMember(memberId: string, limit = 50): Promise<CboRefundRequest[]> {
  const { data, error } = await (supabase as any)
    .from('refund_requests')
    .select('id, member_id, contribution_id, contribution_type, original_amount, requested_amount, payout_amount, reason, status, rejection_reason, created_at, resolved_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch refund requests');
  return (data ?? []).map((row: any) => ({
    ...row,
    original_amount: toNumber(row.original_amount),
    requested_amount: toNumber(row.requested_amount),
    payout_amount: toNumber(row.payout_amount),
  }));
}

export async function fetchPendingRefundRequests(limit = 100): Promise<CboRefundRequest[]> {
  const { data, error } = await (supabase as any)
    .from('refund_requests')
    .select('id, member_id, contribution_id, contribution_type, original_amount, requested_amount, payout_amount, reason, status, rejection_reason, created_at, resolved_at')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch pending refund requests');
  return (data ?? []).map((row: any) => ({
    ...row,
    original_amount: toNumber(row.original_amount),
    requested_amount: toNumber(row.requested_amount),
    payout_amount: toNumber(row.payout_amount),
  }));
}

export async function fetchExpenditures(limit = 200): Promise<CboExpenditure[]> {
  const { data, error } = await (supabase as any)
    .from('expenditures')
    .select('id, amount, category, description, payment_method, initiated_by, status, approved_at, rejection_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch expenditures');
  return (data ?? []).map((row: any) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function fetchPendingExpenditures(limit = 100): Promise<CboExpenditure[]> {
  const { data, error } = await (supabase as any)
    .from('expenditures')
    .select('id, amount, category, description, payment_method, initiated_by, status, approved_at, rejection_reason, created_at')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Failed to fetch pending expenditures');
  return (data ?? []).map((row: any) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function fetchFinanceApprovalsForEntities(
  entityType: FinanceEntityType,
  entityIds: string[],
): Promise<Record<string, FinanceApproval[]>> {
  if (entityIds.length === 0) return {};

  const { data, error } = await (supabase as any)
    .from('finance_approvals')
    .select('id, entity_type, entity_id, required_role, decision, approver_id, approver_role, notes, decided_at, created_at')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds);

  if (error) throw new Error(error.message || 'Failed to fetch finance approvals');

  const grouped: Record<string, FinanceApproval[]> = {};
  (data ?? []).forEach((row: FinanceApproval) => {
    if (!grouped[row.entity_id]) {
      grouped[row.entity_id] = [];
    }
    grouped[row.entity_id].push(row);
  });

  return grouped;
}

export function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}
