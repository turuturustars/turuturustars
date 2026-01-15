import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransactionStatus {
  checkoutRequestId: string;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  amount: number;
  phone: string;
  mpesaReceipt?: string;
  createdAt: string;
  updatedAt: string;
  isComplete: boolean;
  isFailed: boolean;
}

export function useTransactionStatus(checkoutRequestId: string | null) {
  const [transaction, setTransaction] = useState<TransactionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(!!checkoutRequestId);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!checkoutRequestId) {
      setTransaction(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('mpesa_transactions')
        .select('*')
        .eq('checkout_request_id', checkoutRequestId)
        .single();

      if (queryError) {
        if (queryError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is OK during initial state
          throw queryError;
        }
        setTransaction(null);
      } else if (data) {
        setTransaction({
          checkoutRequestId: data.checkout_request_id,
          status: data.status,
          amount: data.amount,
          phone: data.phone_number,
          mpesaReceipt: data.mpesa_receipt_number,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          isComplete: data.status === 'completed',
          isFailed: data.status === 'failed',
        });
      }
    } catch (err) {
      console.error('Error fetching transaction status:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [checkoutRequestId]);

  // Initial fetch
  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  // Set up polling if transaction is pending
  useEffect(() => {
    if (!checkoutRequestId || !transaction || transaction.status !== 'pending') {
      return;
    }

    const interval = setInterval(fetchTransaction, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [checkoutRequestId, transaction, fetchTransaction]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!checkoutRequestId) return;

    const subscription = supabase
      .from('mpesa_transactions')
      .on('*', { event: 'UPDATE', schema: 'public', filter: `checkout_request_id=eq.${checkoutRequestId}` }, (payload) => {
        if (payload.new) {
          setTransaction({
            checkoutRequestId: payload.new.checkout_request_id,
            status: payload.new.status,
            amount: payload.new.amount,
            phone: payload.new.phone_number,
            mpesaReceipt: payload.new.mpesa_receipt_number,
            createdAt: payload.new.created_at,
            updatedAt: payload.new.updated_at,
            isComplete: payload.new.status === 'completed',
            isFailed: payload.new.status === 'failed',
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [checkoutRequestId]);

  const refresh = useCallback(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  return {
    transaction,
    isLoading,
    error,
    refresh,
  };
}
