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

interface MpesaTransaction {
  checkout_request_id: string;
  amount: number;
  phone_number: string;
  status: string;
  mpesa_receipt_number?: string;
  created_at: string;
}

/**
 * Hook for monitoring M-Pesa payment metrics
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

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get today's transactions
      const { data: todayTx } = await supabase
        .from('mpesa_transactions')
        .select('amount, status')
        .gte('created_at', todayStart);

      // Get weekly transactions
      const { data: weeklyTx } = await supabase
        .from('mpesa_transactions')
        .select('amount, status, created_at')
        .gte('created_at', weekStart);

      // Calculate metrics
      const todayData = todayTx || [];
      const weeklyData = weeklyTx || [];

      const todayCompleted = todayData.filter(t => t.status === 'completed');
      const todayTotal = todayData.length;
      const todayAmount = todayCompleted.reduce((sum, t) => sum + (t.amount || 0), 0);

      const weeklyCompleted = weeklyData.filter(t => t.status === 'completed');
      const weeklyTotal = weeklyData.length;
      const weeklyAmount = weeklyCompleted.reduce((sum, t) => sum + (t.amount || 0), 0);

      const allAmount = weeklyData.reduce((sum, t) => sum + (t.amount || 0), 0);
      const allProcessing = weeklyData
        .filter(t => t.status === 'completed')
        .map(t => {
          const created = new Date(t.created_at).getTime();
          const now = Date.now();
          return now - created;
        });

      setMetrics({
        todayTotal: todayAmount,
        todayCount: todayCompleted.length,
        todaySuccessRate: todayTotal > 0 ? (todayCompleted.length / todayTotal) * 100 : 0,
        weeklyTotal: weeklyAmount,
        weeklyCount: weeklyCompleted.length,
        averageAmount: weeklyTotal > 0 ? allAmount / weeklyTotal : 0,
        pendingCount: weeklyData.filter(t => t.status === 'pending').length,
        failedCount: weeklyData.filter(t => t.status === 'failed').length,
        averageProcessingTime:
          allProcessing.length > 0
            ? allProcessing.reduce((a, b) => a + b, 0) / allProcessing.length / 1000
            : 0,
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
        .select('*')
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

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('mpesa_transactions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mpesa_transactions' },
        (payload) => {
          const newTx = payload.new as MpesaTransaction | null;
          if (newTx) {
            setPayments(prev => {
              const updated = [
                {
                  checkoutRequestId: newTx.checkout_request_id,
                  amount: newTx.amount,
                  phone: newTx.phone_number,
                  status: newTx.status as PaymentSummary['status'],
                  mpesaReceipt: newTx.mpesa_receipt_number,
                  createdAt: newTx.created_at,
                },
                ...prev,
              ];
              return updated.slice(0, limit);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

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
        .select('*')
        .gte('created_at', timeWindow)
        .in('status', ['failed', 'timeout', 'pending'])
        .order('created_at', { ascending: false });

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
