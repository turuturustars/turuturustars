import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRoles } from '@/lib/rolePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Clock, DollarSign, Download } from 'lucide-react';
import { format } from 'date-fns';
import { markMembershipFeePaid } from '@/lib/membershipFee';

interface MembershipContribution {
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
  profiles?: {
    full_name: string;
    email: string | null;
    phone: string;
  };
}

const TreasurerMembershipFees = () => {
  const { roles, hasRole } = useAuth();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<MembershipContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<MembershipContribution | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentReference: '',
    notes: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const userRoles = normalizeRoles(roles);
  const canAccess = userRoles.includes('treasurer') || userRoles.includes('admin') || userRoles.includes('chairperson');

  useEffect(() => {
    if (!canAccess) {
      toast({
        title: 'Access Denied',
        description: 'Only treasurers can view membership fees.',
        variant: 'destructive',
      });
      return;
    }

    fetchMembershipContributions();
  }, [canAccess]);

  const fetchMembershipContributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          profiles:member_id (
            full_name,
            email,
            phone
          )
        `)
        .eq('contribution_type', 'membership_fee')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions((data as MembershipContribution[]) || []);
    } catch (err) {
      console.error('Error fetching membership contributions:', err);
      toast({
        title: 'Error',
        description: 'Failed to load membership fees.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
      await markMembershipFeePaid(selectedContribution.member_id);

      // Update local state
      setContributions((prev) =>
        prev.map((c) =>
          c.id === selectedContribution.id
            ? {
                ...c,
                status: 'paid' as const,
                paid_at: new Date().toISOString(),
                reference_number: paymentData.paymentReference,
                notes: paymentData.notes || null,
              }
            : c
        )
      );

      toast({
        title: 'Payment Recorded',
        description: `Membership fee payment has been recorded successfully.`,
      });

      setIsPaymentDialogOpen(false);
      setPaymentData({ paymentReference: '', notes: '' });
      setSelectedContribution(null);
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

  const filteredContributions = contributions.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: contributions.length,
    paid: contributions.filter((c) => c.status === 'paid').length,
    pending: contributions.filter((c) => c.status === 'pending').length,
    missed: contributions.filter((c) => c.status === 'missed').length,
    totalAmount: contributions.reduce((sum, c) => sum + c.amount, 0),
    totalPaid: contributions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0),
    totalPending: contributions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'missed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 text-green-700';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      case 'missed':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const handleExport = () => {
    const headers = ['Member Name', 'Email', 'Amount', 'Due Date', 'Status', 'Paid Date', 'Reference'];
    const rows = filteredContributions.map((c) => [
      c.profiles?.full_name || 'Unknown',
      c.profiles?.email || '',
      c.amount,
      c.due_date ? format(new Date(c.due_date), 'dd/MM/yyyy') : '-',
      c.status,
      c.paid_at ? format(new Date(c.paid_at), 'dd/MM/yyyy') : '-',
      c.reference_number || '-',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `membership_fees_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">KES {stats.totalPending}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.pending} pending fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {stats.totalPaid}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.paid} fees collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Missed Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.missed}</div>
            <p className="text-xs text-muted-foreground mt-1">Requiring follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Fee records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter membership fees by status</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Membership Fees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Fees</CardTitle>
          <CardDescription>Showing {filteredContributions.length} of {contributions.length} fees</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContributions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No membership fees found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {filteredContributions.map((contribution) => (
                  <Card key={contribution.id} className="border border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {contribution.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contribution.profiles?.email || '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">KES {contribution.amount}</p>
                          <div className="mt-1">
                            <Badge className={getStatusColor(contribution.status)}>
                              {getStatusIcon(contribution.status)}
                              <span className="ml-1 capitalize">{contribution.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p>
                            {contribution.due_date
                              ? format(new Date(contribution.due_date), 'dd MMM yyyy')
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid Date</p>
                          <p>
                            {contribution.paid_at
                              ? format(new Date(contribution.paid_at), 'dd MMM yyyy')
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {contribution.status !== 'paid' && (
                        <div className="pt-2 border-t">
                          <Button
                            onClick={() => {
                              setSelectedContribution(contribution);
                              setIsPaymentDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            Record Payment
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell className="font-medium">
                        {contribution.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contribution.profiles?.email}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {contribution.amount}
                      </TableCell>
                      <TableCell>
                        {contribution.due_date
                          ? format(new Date(contribution.due_date), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(contribution.status)}>
                          {getStatusIcon(contribution.status)}
                          <span className="ml-1 capitalize">{contribution.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contribution.paid_at
                          ? format(new Date(contribution.paid_at), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {contribution.status !== 'paid' && (
                          <Button
                            onClick={() => {
                              setSelectedContribution(contribution);
                              setIsPaymentDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Record Payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Recording Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record membership fee payment for{' '}
              <strong>{selectedContribution?.profiles?.full_name}</strong> - KES{' '}
              {selectedContribution?.amount}
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

export default TreasurerMembershipFees;
