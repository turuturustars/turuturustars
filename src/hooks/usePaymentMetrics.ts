import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentMetrics {
  todayTotal: number;
  todayCount: number;
  todaySuccessRate: number;
  weeklyTotal: number;
  weeklyCount: number;
  averageAmount: number;
  pendingCount: number;
  failedCount: number;
  averageProcessingTime: number;
}

export interface PaymentSummary {
  checkoutRequestId: string;
  amount: number;
  phone: string;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  mpesaReceipt?: string;
  createdAt: string;
  processingTime?: number;
}

type NumericValue = number | string | null | undefined;

const toNumber = (value: NumericValue): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

/**
 * Hook for monitoring Pay with M-Pesa metrics
 */
export function usePaymentMetrics() {
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    todayTotal: 0,
    todayCount: 0,
    todaySuccessRate: 0,
    weeklyTotal: 0,
    weeklyCount: 0,
    averageAmount: 0,
    pendingCount: 0,
    failedCount: 0,
    averageProcessingTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: metricsError } = await supabase.rpc('get_payment_metrics' as never);
      if (metricsError) throw metricsError;

      const row = data as {
        todayTotal?: NumericValue;
        todayCount?: NumericValue;
        todaySuccessRate?: NumericValue;
        weeklyTotal?: NumericValue;
        weeklyCount?: NumericValue;
        averageAmount?: NumericValue;
        pendingCount?: NumericValue;
        failedCount?: NumericValue;
        averageProcessingTime?: NumericValue;
      } | null;

      setMetrics({
        todayTotal: toNumber(row?.todayTotal),
        todayCount: toNumber(row?.todayCount),
        todaySuccessRate: toNumber(row?.todaySuccessRate),
        weeklyTotal: toNumber(row?.weeklyTotal),
        weeklyCount: toNumber(row?.weeklyCount),
        averageAmount: toNumber(row?.averageAmount),
        pendingCount: toNumber(row?.pendingCount),
        failedCount: toNumber(row?.failedCount),
        averageProcessingTime: toNumber(row?.averageProcessingTime),
      });
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refresh: fetchMetrics };
}

/**
 * Hook for recent payment summaries
 */
export function useRecentPayments(limit: number = 10) {
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('mpesa_transactions')
        .select('checkout_request_id, amount, phone_number, status, mpesa_receipt_number, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (queryError) throw queryError;

      const summaries = (data || []).map(tx => ({
        checkoutRequestId: tx.checkout_request_id,
        amount: tx.amount,
        phone: tx.phone_number,
        status: tx.status as PaymentSummary['status'],
        mpesaReceipt: tx.mpesa_receipt_number,
        createdAt: tx.created_at,
      }));

      setPayments(summaries);
    } catch (err) {
      console.error('Error fetching recent payments:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchPayments]);

  return { payments, isLoading, error, refresh: fetchPayments };
}

/**
 * Hook for payment failures and issues
 */
export function usePaymentIssues(timeWindowHours: number = 24) {
  const [issues, setIssues] = useState<PaymentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIssues = useCallback(async () => {
    try {
      setIsLoading(true);

      const timeWindow = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('mpesa_transactions')
        .select('checkout_request_id, amount, phone_number, status, mpesa_receipt_number, created_at')
        .gte('created_at', timeWindow)
        .in('status', ['failed', 'timeout', 'pending'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const summaries = (data || []).map(tx => ({
        checkoutRequestId: tx.checkout_request_id,
        amount: tx.amount,
        phone: tx.phone_number,
        status: tx.status as PaymentSummary['status'],
        mpesaReceipt: tx.mpesa_receipt_number,
        createdAt: tx.created_at,
      }));

      setIssues(summaries);
    } catch (err) {
      console.error('Error fetching payment issues:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeWindowHours]);

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [fetchIssues]);

  return { issues, isLoading, refresh: fetchIssues };
}
