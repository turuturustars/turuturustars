import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WelfareTransaction {
  id: string;
  welfare_case_id: string;
  member_id: string;
  amount: number;
  contribution_type: string;
  status: 'pending' | 'paid' | 'missed';
  reference_number: string | null;
  notes: string | null;
  created_at: string | null;
  paid_at: string | null;
  profiles?: {
    full_name: string;
  } | null;
}

export interface WelfareTransactionFormData {
  amount: number;
  mpesa_code?: string;
  notes?: string;
}

export const useWelfareTransactions = (caseId: string | null) => {
  const [transactions, setTransactions] = useState<WelfareTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = async () => {
    if (!caseId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          profiles:member_id (full_name)
        `)
        .eq('welfare_case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data as WelfareTransaction[]) || []);
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
        .from('contributions')
        .insert({
          welfare_case_id: caseId,
          member_id: userId,
          amount: formData.amount,
          contribution_type: 'welfare',
          reference_number: formData.mpesa_code || null,
          notes: formData.notes || null,
          status: 'paid',
          paid_at: new Date().toISOString(),
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
        .from('contributions')
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
