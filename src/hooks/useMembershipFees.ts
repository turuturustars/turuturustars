import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MembershipFee {
  id: string;
  member_id: string;
  amount: number;
  fee_type: 'initial' | 'renewal';
  due_date: string;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useMembershipFees = (memberId?: string) => {
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;

    const fetchMembershipFees = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('membership_fees')
          .select('*')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFees(data || []);
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
          table: 'membership_fees',
          filter: `member_id=eq.${memberId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFees((prev) => [payload.new as MembershipFee, ...prev]);
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
  const dueDate = new Date(fee.due_date);
  const today = new Date();
  
  if (fee.status === 'paid') return 'Paid';
  if (fee.status === 'cancelled') return 'Cancelled';
  
  if (today > dueDate) {
    return 'Overdue';
  }
  
  return 'Pending';
};

export const getMembershipFeeColor = (status: string): string => {
  switch (status) {
    case 'Paid':
      return 'text-green-600 bg-green-50';
    case 'Overdue':
      return 'text-red-600 bg-red-50';
    case 'Pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'Cancelled':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const getNextRenewalDate = (joinedAt: string): Date => {
  const joined = new Date(joinedAt);
  return new Date(joined.getFullYear() + 1, joined.getMonth(), joined.getDate());
};
