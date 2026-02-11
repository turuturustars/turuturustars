import { supabase } from '@/integrations/supabase/client';

export type CboPaymentStatus = 'pending' | 'completed' | 'failed' | 'awaiting_approval';
export type CboPaymentMethod = 'stk' | 'till';

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
  paymentId: string;
  decision: 'approved' | 'rejected';
  notes?: string;
}

function parseFunctionError(error: unknown, fallbackMessage: string): Error {
  if (!error) {
    return new Error(fallbackMessage);
  }

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message);
    return new Error(message || fallbackMessage);
  }

  return new Error(fallbackMessage);
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
    body: {
      submission_id: submissionId,
    },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to verify till submission');
  }

  return data;
}

export async function approvePaymentDecision(input: ApprovalDecisionInput) {
  const { data, error } = await supabase.functions.invoke('approve-payment', {
    body: {
      payment_id: input.paymentId,
      decision: input.decision,
      notes: input.notes,
    },
  });

  if (error || !data?.ok) {
    throw parseFunctionError(error ?? data, data?.error || 'Failed to submit approval decision');
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

  if (error) {
    throw new Error(error.message || 'Failed to fetch payments');
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export async function fetchPaymentByCheckoutId(checkoutRequestId: string): Promise<CboPayment | null> {
  const { data, error } = await (supabase as any)
    .from('payments')
    .select('id, member_id, phone, amount, method, checkout_request_id, merchant_request_id, mpesa_receipt, status, verified_at, created_at')
    .eq('checkout_request_id', checkoutRequestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch payment status');
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    amount: Number(data.amount),
  };
}

export async function fetchAwaitingApprovalPayments(limit = 100): Promise<CboPayment[]> {
  const { data, error } = await (supabase as any)
    .from('payments')
    .select('id, member_id, phone, amount, method, checkout_request_id, merchant_request_id, mpesa_receipt, status, verified_at, created_at')
    .eq('status', 'awaiting_approval')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Failed to fetch awaiting approvals');
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export async function fetchFinancePayments(limit = 200): Promise<CboPayment[]> {
  const { data, error } = await (supabase as any)
    .from('payments')
    .select('id, member_id, phone, amount, method, checkout_request_id, merchant_request_id, mpesa_receipt, status, verified_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Failed to fetch payment records');
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}
