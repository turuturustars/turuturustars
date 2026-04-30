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
  created_at: string;
  contribution_id?: string | null;
  welfare_case_id?: string | null;
  discipline_id?: string | null;
};

export const useWallet = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);

    // Ensure wallet exists
    await supabase.rpc('ensure_wallet', { _user_id: targetId } as never);

    const [{ data: w }, { data: tx }] = await Promise.all([
      supabase.from('wallets' as never).select('*').eq('user_id', targetId).maybeSingle(),
      supabase
        .from('wallet_transactions' as never)
        .select('*')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    setWallet((w as WalletRow) || null);
    setTransactions((tx as WalletTxn[]) || []);
    setLoading(false);
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

  return { wallet, transactions, loading, refresh: fetchAll, spend };
};

export default useWallet;
