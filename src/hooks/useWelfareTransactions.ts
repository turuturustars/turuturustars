import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WelfareTransaction {
  id: string;
  welfare_case_id: string;
  amount: number;
  transaction_type: 'contribution' | 'refund';
  mpesa_code: string | null;
  recorded_by_id: string;
  recorded_by: {
    full_name: string;
  } | null;
  notes: string | null;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface WelfareTransactionFormData {
  amount: number;
  mpesa_code?: string;
  notes?: string;
  transaction_type: 'contribution' | 'refund';
}

export const useWelfareTransactions = (caseId: string | null) => {
  const [transactions, setTransactions] = useState<WelfareTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = async () => {
    if (!caseId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('welfare_transactions')
        .select(`
          *,
          recorded_by:recorded_by_id (full_name)
        `)
        .eq('welfare_case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addTransaction = async (userId: string, formData: WelfareTransactionFormData) => {
    try {
      const { error } = await supabase
        .from('welfare_transactions')
        .insert({
          welfare_case_id: caseId,
          amount: formData.amount,
          transaction_type: formData.transaction_type,
          mpesa_code: formData.mpesa_code || null,
          recorded_by_id: userId,
          notes: formData.notes || null,
          status: 'completed',
        });

      if (error) throw error;
      
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const removeTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('welfare_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;
      
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error removing transaction:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [caseId]);

  return {
    transactions,
    isLoading,
    fetchTransactions,
    addTransaction,
    removeTransaction,
  };
};

export default useWelfareTransactions;
