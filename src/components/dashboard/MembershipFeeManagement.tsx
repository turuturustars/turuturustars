import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Clock, CreditCard, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { markMembershipFeePaid } from '@/lib/membershipFee';

interface MemberContribution {
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

const MembershipFeeManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<MemberContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<MemberContribution | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentReference: '',
    notes: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchContributions = async () => {
      try {
        const { data, error } = await supabase
          .from('contributions')
          .select('*')
          .eq('member_id', profile.id)
          .eq('contribution_type', 'membership_fee')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContributions((data as MemberContribution[]) || []);
      } catch (err) {
        console.error('Error fetching contributions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [profile?.id]);

  const handlePaymentSubmit = async () => {
    if (!selectedContribution || !paymentData.paymentReference) {
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
        .from('contributions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          reference_number: paymentData.paymentReference,
          notes: paymentData.notes || null,
        })
        .eq('id', selectedContribution.id);

      if (error) throw error;
      if (selectedContribution.contribution_type === 'membership_fee' && profile?.id) {
        await markMembershipFeePaid(profile.id);
      }

      toast({
        title: 'Payment Recorded',
        description: `Membership fee payment of KES ${selectedContribution.amount} has been recorded successfully.`,
      });

      setIsPaymentDialogOpen(false);
      setPaymentData({ paymentReference: '', notes: '' });
      setSelectedContribution(null);
      
      // Refresh contributions
      const { data } = await supabase
        .from('contributions')
        .select('*')
        .eq('member_id', profile?.id)
        .eq('contribution_type', 'membership_fee')
        .order('created_at', { ascending: false });
      setContributions((data as MemberContribution[]) || []);
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
    if (!profile?.joined_at) return 'Not available';

    try {
      const joinedDate = new Date(profile.joined_at);
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
    } catch {
      return 'Error calculating renewal date';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'missed':
        return 'text-red-600 bg-red-50';
      case 'pending':
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const pendingContribution = contributions.find((c) => c.status === 'pending');
  const membershipFeeAmount = (() => {
    if (pendingContribution?.amount) return pendingContribution.amount;
    const profileAmount = Number(profile?.membership_fee_amount);
    if (Number.isFinite(profileAmount) && profileAmount > 0) return profileAmount;
    return 200;
  })();
  const totalPaid = contributions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Membership Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {membershipFeeAmount}</div>
            <p className="text-xs text-muted-foreground mt-1">Annual fee per member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Registration Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.joined_at ? format(new Date(profile.joined_at), 'dd MMM yyyy') : 'N/A'}
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
      {pendingContribution && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-yellow-900">Payment Pending</CardTitle>
              </div>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                Membership Fee
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800 mb-4">
              You have a pending membership fee of <strong>KES {pendingContribution.amount}</strong>
              {pendingContribution.due_date && (
                <> due on <strong>{format(new Date(pendingContribution.due_date), 'dd MMM yyyy')}</strong></>
              )}
            </p>
            <Button
              onClick={() => {
                setSelectedContribution(pendingContribution);
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
            {contributions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No membership fee records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
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
                    {contributions.map((contribution) => (
                      <tr key={contribution.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 capitalize">{contribution.contribution_type.replace('_', ' ')}</td>
                        <td className="py-3 px-2 font-semibold">KES {contribution.amount}</td>
                        <td className="py-3 px-2">
                          {contribution.due_date ? format(new Date(contribution.due_date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={getStatusColor(contribution.status)}>
                            {contribution.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {contribution.status === 'missed' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {contribution.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          {contribution.paid_at ? format(new Date(contribution.paid_at), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {contribution.reference_number || '-'}
                        </td>
                      </tr>
                    ))}
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
              Record the membership fee payment for KES {selectedContribution?.amount}
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
