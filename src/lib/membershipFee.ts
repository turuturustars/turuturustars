import { supabase } from '@/integrations/supabase/client';

export const markMembershipFeePaid = async (memberId: string) => {
  if (!memberId) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      registration_fee_paid: true,
      membership_fee_paid: true,
      membership_fee_paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('registration_fee_paid', false);

  if (error) {
    console.warn('Failed to mark membership fee as paid:', error);
  }
};

