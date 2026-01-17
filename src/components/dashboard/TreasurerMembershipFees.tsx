import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { AlertCircle, CheckCircle, Clock, DollarSign, Download, Filter } from 'lucide-react';
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
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

const TreasurerMembershipFees = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<MembershipFee | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentReference: '',
    notes: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Only allow treasurers and admins
    if (!['treasurer', 'admin', 'chairperson'].includes(userRole || '')) {
      toast({
        title: 'Access Denied',
        description: 'Only treasurers can view membership fees.',
        variant: 'destructive',
      });
      return;
    }

    fetchMembershipFees();
  }, [userRole]);

  const fetchMembershipFees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membership_fees')
        .select(`
          *,
          profiles!membership_fees_member_id_fkey(
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFees(data || []);
    } catch (err) {
      console.error('Error fetching membership fees:', err);
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

      // Update local state
      setFees((prev) =>
        prev.map((fee) =>
          fee.id === selectedFee.id
            ? {
                ...fee,
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_reference: paymentData.paymentReference,
                notes: paymentData.notes || null,
              }
            : fee
        )
      );

      toast({
        title: 'Payment Recorded',
        description: `Membership fee payment has been recorded successfully.`,
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

  const filteredFees = fees.filter((fee) => {
    if (statusFilter !== 'all' && fee.status !== statusFilter) return false;
    if (typeFilter !== 'all' && fee.fee_type !== typeFilter) return false;
    return true;
  });

  const stats = {
    total: fees.length,
    paid: fees.filter((f) => f.status === 'paid').length,
    pending: fees.filter((f) => f.status === 'pending').length,
    overdue: fees.filter((f) => f.status === 'overdue').length,
    totalAmount: fees.reduce((sum, f) => sum + f.amount, 0),
    totalPaid: fees
      .filter((f) => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0),
    totalPending: fees
      .filter((f) => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
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
      case 'overdue':
        return 'bg-red-50 text-red-700';
      case 'cancelled':
        return 'bg-gray-50 text-gray-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const handleExport = () => {
    // Create CSV
    const headers = ['Member Name', 'Email', 'Type', 'Amount', 'Due Date', 'Status', 'Paid Date', 'Reference'];
    const rows = filteredFees.map((fee) => [
      fee.profiles?.full_name || 'Unknown',
      fee.profiles?.email || '',
      fee.fee_type,
      fee.amount,
      format(new Date(fee.due_date), 'dd/MM/yyyy'),
      fee.status,
      fee.paid_at ? format(new Date(fee.paid_at), 'dd/MM/yyyy') : '-',
      fee.payment_reference || '-',
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
            <CardTitle className="text-sm font-medium">Overdue Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Requiring follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
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
              <CardDescription>Filter membership fees by status and type</CardDescription>
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
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="initial">Initial Fee</SelectItem>
                  <SelectItem value="renewal">Renewal Fee</SelectItem>
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
          <CardDescription>Showing {filteredFees.length} of {fees.length} fees</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No membership fees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">
                        {fee.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fee.profiles?.email}
                      </TableCell>
                      <TableCell className="capitalize">{fee.fee_type}</TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {fee.amount}
                      </TableCell>
                      <TableCell>
                        {format(new Date(fee.due_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(fee.status)}>
                          {getStatusIcon(fee.status)}
                          <span className="ml-1 capitalize">{fee.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {fee.paid_at
                          ? format(new Date(fee.paid_at), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {fee.status !== 'paid' && (
                          <Button
                            onClick={() => {
                              setSelectedFee(fee);
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
              <strong>{selectedFee?.profiles?.full_name}</strong> - KES{' '}
              {selectedFee?.amount}
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
