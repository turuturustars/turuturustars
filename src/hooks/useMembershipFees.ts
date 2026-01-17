import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MembershipFee {
  id: string;
  member_id: string;
  amount: number;
  contribution_type: string;
  due_date: string | null;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'missed';
  reference_number: string | null;
  notes: string | null;
  created_at: string | null;
}

export const useMembershipFees = (memberId?: string) => {
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }

    const fetchMembershipFees = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contributions')
          .select('*')
          .eq('member_id', memberId)
          .eq('contribution_type', 'membership_fee')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFees((data as MembershipFee[]) || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch membership fees';
        setError(message);
        console.error('Error fetching membership fees:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembershipFees();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`membership_fees_${memberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `member_id=eq.${memberId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as MembershipFee;
            if (newRecord.contribution_type === 'membership_fee') {
              setFees((prev) => [newRecord, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setFees((prev) =>
              prev.map((fee) => (fee.id === payload.new.id ? (payload.new as MembershipFee) : fee))
            );
          } else if (payload.eventType === 'DELETE') {
            setFees((prev) => prev.filter((fee) => fee.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [memberId]);

  return { fees, loading, error };
};

export const getMembershipFeeStatus = (fee: MembershipFee): string => {
  if (fee.status === 'paid') return 'Paid';
  if (fee.status === 'missed') return 'Missed';
  
  if (fee.due_date) {
    const dueDate = new Date(fee.due_date);
    const today = new Date();
    if (today > dueDate) {
      return 'Overdue';
    }
  }
  
  return 'Pending';
};

export const getMembershipFeeColor = (status: string): string => {
  switch (status) {
    case 'Paid':
      return 'text-green-600 bg-green-50';
    case 'Overdue':
    case 'Missed':
      return 'text-red-600 bg-red-50';
    case 'Pending':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const getNextRenewalDate = (joinedAt: string): Date => {
  const joined = new Date(joinedAt);
  return new Date(joined.getFullYear() + 1, joined.getMonth(), joined.getDate());
};
