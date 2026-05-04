import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type KittyCategory = 'emergency' | 'education' | 'welfare' | 'project' | 'other';
export type KittyStatus = 'active' | 'paused' | 'completed' | 'closed';
export type KittySource = 'mpesa' | 'wallet' | 'manual';

export type KittyRow = {
  id: string;
  title: string;
  description: string | null;
  category: KittyCategory;
  target_amount: number;
  deadline: string | null;
  balance: number;
  total_contributed: number;
  total_disbursed: number;
  status: KittyStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  beneficiary_name: string | null;
  beneficiary_phone: string | null;
  beneficiary_relationship: string | null;
  beneficiary_details: string | null;
  beneficiary_member_id: string | null;
};

export type KittyContributionRow = {
  id: string;
  kitty_id: string;
  member_id: string;
  amount: number;
  source: KittySource;
  reference: string | null;
  created_at: string;
  notes: string | null;
};

export type KittyDisbursementRow = {
  id: string;
  kitty_id: string;
  amount: number;
  purpose: string;
  recipient: string | null;
  reference: string | null;
  recorded_by: string;
  created_at: string;
};

export const useKitties = () => {
  const [kitties, setKitties] = useState<KittyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kitties' as never)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setKitties(data as unknown as KittyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: any insert/update/delete on kitties refreshes
  useEffect(() => {
    const ch = supabase
      .channel('kitties-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitties' },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  return { kitties, loading, refresh: fetchAll };
};

export const useKittyDetail = (kittyId: string | undefined) => {
  const { user } = useAuth();
  const [kitty, setKitty] = useState<KittyRow | null>(null);
  const [contributions, setContributions] = useState<KittyContributionRow[]>([]);
  const [disbursements, setDisbursements] = useState<KittyDisbursementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!kittyId) return;
    setLoading(true);
    const [{ data: k }, { data: c }, { data: d }] = await Promise.all([
      supabase.from('kitties' as never).select('*').eq('id', kittyId).maybeSingle(),
      supabase
        .from('kitty_contributions' as never)
        .select('*')
        .eq('kitty_id', kittyId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('kitty_disbursements' as never)
        .select('*')
        .eq('kitty_id', kittyId)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    setKitty((k as unknown as KittyRow) || null);
    setContributions((c as unknown as KittyContributionRow[]) || []);
    setDisbursements((d as unknown as KittyDisbursementRow[]) || []);
    setLoading(false);
  }, [kittyId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!kittyId) return;
    const ch = supabase
      .channel(`kitty-${kittyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitties', filter: `id=eq.${kittyId}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitty_contributions', filter: `kitty_id=eq.${kittyId}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitty_disbursements', filter: `kitty_id=eq.${kittyId}` },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [kittyId, fetchAll]);

  const contributeFromWallet = useCallback(
    async (amount: number, notes?: string) => {
      if (!kittyId) throw new Error('No kitty selected');
      const { data, error } = await supabase.rpc('contribute_to_kitty_from_wallet', {
        _kitty_id: kittyId,
        _amount: amount,
        _notes: notes ?? null,
      } as never);
      if (error) throw error;
      await fetchAll();
      return data as unknown as { contribution_id: string; reference: string; new_balance: number };
    },
    [kittyId, fetchAll]
  );

  const recordDisbursement = useCallback(
    async (params: { amount: number; purpose: string; recipient?: string; reference?: string }) => {
      if (!kittyId) throw new Error('No kitty selected');
      const { data, error } = await supabase.rpc('record_kitty_disbursement', {
        _kitty_id: kittyId,
        _amount: params.amount,
        _purpose: params.purpose,
        _recipient: params.recipient ?? null,
        _reference: params.reference ?? null,
      } as never);
      if (error) throw error;
      await fetchAll();
      return data as unknown as string;
    },
    [kittyId, fetchAll]
  );

  return {
    kitty,
    contributions,
    disbursements,
    loading,
    refresh: fetchAll,
    contributeFromWallet,
    recordDisbursement,
    currentUserId: user?.id,
  };
};

export default useKitties;
