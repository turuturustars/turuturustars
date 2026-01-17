import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMembershipFees, getMembershipFeeStatus, getMembershipFeeColor } from '@/hooks/useMembershipFees';
import { AlertCircle, CheckCircle, Clock, CreditCard, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface MembershipFee {
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

interface MemberProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  membership_fee_paid: boolean;
  membership_fee_paid_at: string | null;
  joined_at: string;
  next_membership_renewal_date: string | null;
}

const MembershipFeeManagement = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { fees, loading } = useMembershipFees(profile?.id);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<MembershipFee | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentReference: '',
    notes: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchMemberProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, membership_fee_paid, membership_fee_paid_at, joined_at, next_membership_renewal_date')
          .eq('id', profile.id)
          .single();

        if (error) throw error;
        setMemberProfile(data);
      } catch (err) {
        console.error('Error fetching member profile:', err);
      }
    };

    fetchMemberProfile();
  }, [profile?.id]);

  const handlePaymentSubmit = async () => {
    if (!selectedFee || !paymentData.paymentReference) {
      toast({
        title: 'Required Field',
        description: 'Please provide a payment reference',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('membership_fees')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference: paymentData.paymentReference,
          notes: paymentData.notes || null,
        })
        .eq('id', selectedFee.id);

      if (error) throw error;

      // Update profile if this is initial fee
      if (selectedFee.fee_type === 'initial') {
        await supabase
          .from('profiles')
          .update({
            membership_fee_paid: true,
            membership_fee_paid_at: new Date().toISOString(),
          })
          .eq('id', profile?.id);
      }

      toast({
        title: 'Payment Recorded',
        description: `Membership fee payment of KES ${selectedFee.amount} has been recorded successfully.`,
      });

      setIsPaymentDialogOpen(false);
      setPaymentData({ paymentReference: '', notes: '' });
      setSelectedFee(null);
    } catch (err) {
      console.error('Error processing payment:', err);
      toast({
        title: 'Payment Failed',
        description: 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getNextRenewalInfo = (): string => {
    if (!memberProfile?.joined_at) return 'Not available';

    try {
      const joinedDate = new Date(memberProfile.joined_at);
      const renewalDate = new Date(
        joinedDate.getFullYear() + 1,
        joinedDate.getMonth(),
        joinedDate.getDate()
      );

      const today = new Date();
      if (renewalDate <= today) {
        return 'Renewal due';
      }

      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `In ${daysUntilRenewal} days (${format(renewalDate, 'dd MMM yyyy')})`;
    } catch (err) {
      return 'Error calculating renewal date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const pendingFee = fees.find((f) => f.status === 'pending');
  const totalPaid = fees
    .filter((f) => f.status === 'paid')
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Membership Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES 200</div>
            <p className="text-xs text-muted-foreground mt-1">Annual fee per member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Registration Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memberProfile?.joined_at ? format(new Date(memberProfile.joined_at), 'dd MMM yyyy') : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Member since</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Next Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{getNextRenewalInfo()}</div>
            <p className="text-xs text-muted-foreground mt-1">Annual renewal date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalPaid}</div>
            <p className="text-xs text-muted-foreground mt-1">Fees settled</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payment Alert */}
      {pendingFee && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-yellow-900">Payment Pending</CardTitle>
              </div>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                {pendingFee.fee_type === 'initial' ? 'Initial Fee' : 'Renewal Fee'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800 mb-4">
              You have a pending membership fee of <strong>KES {pendingFee.amount}</strong> due on{' '}
              <strong>{format(new Date(pendingFee.due_date), 'dd MMM yyyy')}</strong>
            </p>
            <Button
              onClick={() => {
                setSelectedFee(pendingFee);
                setIsPaymentDialogOpen(true);
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Membership Fee History */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Fee History</CardTitle>
          <CardDescription>Track all your membership fee payments and renewals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No membership fee records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold">Type</th>
                      <th className="text-left py-2 px-2 font-semibold">Amount</th>
                      <th className="text-left py-2 px-2 font-semibold">Due Date</th>
                      <th className="text-left py-2 px-2 font-semibold">Status</th>
                      <th className="text-left py-2 px-2 font-semibold">Payment Date</th>
                      <th className="text-left py-2 px-2 font-semibold">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((fee) => {
                      const status = getMembershipFeeStatus(fee);
                      const statusColor = getMembershipFeeColor(status);

                      return (
                        <tr key={fee.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 capitalize">{fee.fee_type}</td>
                          <td className="py-3 px-2 font-semibold">KES {fee.amount}</td>
                          <td className="py-3 px-2">{format(new Date(fee.due_date), 'dd MMM yyyy')}</td>
                          <td className="py-3 px-2">
                            <Badge className={statusColor}>
                              {status === 'Paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {status === 'Overdue' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {status === 'Pending' && <Clock className="h-3 w-3 mr-1" />}
                              {status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            {fee.paid_at ? format(new Date(fee.paid_at), 'dd MMM yyyy') : '-'}
                          </td>
                          <td className="py-3 px-2 text-xs text-muted-foreground">
                            {fee.payment_reference || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Recording Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record the membership fee payment for KES {selectedFee?.amount}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentRef">Payment Reference *</Label>
              <Input
                id="paymentRef"
                placeholder="e.g., MPESA Transaction ID, Check Number"
                value={paymentData.paymentReference}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, paymentReference: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this payment..."
                rows={3}
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setPaymentData({ paymentReference: '', notes: '' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePaymentSubmit} disabled={isProcessing}>
              {isProcessing ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembershipFeeManagement;
