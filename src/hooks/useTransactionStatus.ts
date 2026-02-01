import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TransactionStatusType = 'pending' | 'completed' | 'failed' | 'timeout';

export interface TransactionStatus {
  checkoutRequestId: string;
  status: TransactionStatusType;
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
        .select('id, checkout_request_id, phone_number, amount, status, mpesa_receipt_number, created_at, updated_at')
        .eq('checkout_request_id', checkoutRequestId)
        .single();

      if (queryError) {
        if (queryError.code !== 'PGRST116') {
          throw queryError;
        }
        setTransaction(null);
      } else if (data) {
        const status = (data.status || 'pending') as TransactionStatusType;
        setTransaction({
          checkoutRequestId: data.checkout_request_id || '',
          status,
          amount: data.amount,
          phone: data.phone_number,
          mpesaReceipt: data.mpesa_receipt_number || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          isComplete: status === 'completed',
          isFailed: status === 'failed',
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

    const interval = setInterval(fetchTransaction, 2000);

    return () => clearInterval(interval);
  }, [checkoutRequestId, transaction, fetchTransaction]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!checkoutRequestId) return;

    const channel = supabase
      .channel(`transaction-${checkoutRequestId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'mpesa_transactions',
          filter: `checkout_request_id=eq.${checkoutRequestId}`
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as Record<string, unknown>;
            const status = (newData.status as string || 'pending') as TransactionStatusType;
            setTransaction({
              checkoutRequestId: newData.checkout_request_id as string,
              status,
              amount: newData.amount as number,
              phone: newData.phone_number as string,
              mpesaReceipt: newData.mpesa_receipt_number as string | undefined,
              createdAt: newData.created_at as string,
              updatedAt: newData.updated_at as string,
              isComplete: status === 'completed',
              isFailed: status === 'failed',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
