import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type WalletRow = {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WalletTxn = {
  id: string;
  wallet_id: string;
  user_id: string;
  type: string;
  direction: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  status: string;
  reference: string | null;
  description: string | null;
  mpesa_transaction_id?: string | null;
  created_at: string;
  contribution_id?: string | null;
  welfare_case_id?: string | null;
  discipline_id?: string | null;
};

export type WalletTopUp = {
  id: string;
  checkout_request_id: string | null;
  phone_number: string;
  amount: number;
  status: string | null;
  result_desc: string | null;
  mpesa_receipt_number: string | null;
  created_at: string;
  updated_at: string;
};

export const useWallet = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [topUps, setTopUps] = useState<WalletTopUp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!targetId) {
      setWallet(null);
      setTransactions([]);
      setTopUps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Ensure wallet exists
      await supabase.rpc('ensure_wallet', { _user_id: targetId } as never);

      const [{ data: w, error: walletError }, { data: tx, error: txError }, { data: mpesaTopUps, error: topUpError }] =
        await Promise.all([
          supabase.from('wallets' as never).select('*').eq('user_id', targetId).maybeSingle(),
          supabase
            .from('wallet_transactions' as never)
            .select('*')
            .eq('user_id', targetId)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('mpesa_transactions')
            .select('id, checkout_request_id, phone_number, amount, status, result_desc, mpesa_receipt_number, created_at, updated_at')
            .eq('member_id', targetId)
            .eq('transaction_type', 'wallet_topup')
            .order('created_at', { ascending: false })
            .limit(25),
        ]);

      if (walletError) console.error('Error loading wallet:', walletError);
      if (txError) console.error('Error loading wallet transactions:', txError);
      if (topUpError) console.error('Error loading wallet top-ups:', topUpError);

      setWallet((w as WalletRow) || null);
      setTransactions((tx as WalletTxn[]) || []);
      setTopUps((mpesaTopUps as WalletTopUp[]) || []);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!targetId) return;
    const ch = supabase
      .channel(`wallet-${targetId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${targetId}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${targetId}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mpesa_transactions', filter: `member_id=eq.${targetId}` },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [targetId, fetchAll]);

  const spend = useCallback(
    async (params: {
      type: 'dues' | 'welfare' | 'fine';
      amount: number;
      description?: string;
      contribution_id?: string;
      welfare_case_id?: string;
      discipline_id?: string;
      reference?: string;
    }) => {
      if (!targetId) throw new Error('Not signed in');
      // Generate a unique wallet reference (e.g. WLT-FIN-XXXXXXXX)
      const prefix =
        params.type === 'dues' ? 'DUE' : params.type === 'welfare' ? 'WLF' : 'FIN';
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      const ts = Date.now().toString(36).slice(-4).toUpperCase();
      const reference = params.reference ?? `WLT-${prefix}-${ts}${rand}`;

      const { data, error } = await supabase.rpc('process_wallet_transaction', {
        _user_id: targetId,
        _type: params.type,
        _direction: 'debit',
        _amount: params.amount,
        _description: params.description ?? null,
        _reference: reference,
        _mpesa_transaction_id: null,
        _contribution_id: params.contribution_id ?? null,
        _welfare_case_id: params.welfare_case_id ?? null,
        _discipline_id: params.discipline_id ?? null,
      } as never);
      if (error) throw error;
      await fetchAll();
      return { transactionId: data as unknown as string, reference };
    },
    [targetId, fetchAll]
  );

  return { wallet, transactions, topUps, loading, refresh: fetchAll, spend };
};

export default useWallet;
