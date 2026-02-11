import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  approvePaymentDecision,
  CboPayment,
  fetchAwaitingApprovalPayments,
  fetchFinancePayments,
  formatCurrency,
} from '@/lib/mpesaContributionsApi';
import { CheckCircle2, Loader2, RefreshCw, ShieldX } from 'lucide-react';

const CboTreasurerApprovalPanel = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [awaitingPayments, setAwaitingPayments] = useState<CboPayment[]>([]);
  const [allPayments, setAllPayments] = useState<CboPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingPaymentId, setActingPaymentId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const canApprove = hasRole('treasurer') || hasRole('admin');

  const loadData = async () => {
    if (!canApprove) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [awaiting, all] = await Promise.all([fetchAwaitingApprovalPayments(100), fetchFinancePayments(250)]);
      setAwaitingPayments(awaiting);
      setAllPayments(all);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load approval queue';
      toast({
        title: 'Approval queue error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [canApprove]);

  const stats = useMemo(() => {
    const completed = allPayments.filter((payment) => payment.status === 'completed');
    const failed = allPayments.filter((payment) => payment.status === 'failed');
    const awaiting = allPayments.filter((payment) => payment.status === 'awaiting_approval');

    return {
      completedAmount: completed.reduce((sum, payment) => sum + payment.amount, 0),
      failedCount: failed.length,
      awaitingAmount: awaiting.reduce((sum, payment) => sum + payment.amount, 0),
      awaitingCount: awaiting.length,
    };
  }, [allPayments]);

  const handleDecision = async (paymentId: string, decision: 'approved' | 'rejected') => {
    setActingPaymentId(paymentId);
    try {
      const decisionLabel = decision === 'approved' ? 'approved' : 'rejected';
      await approvePaymentDecision({
        paymentId,
        decision,
        notes: notes[paymentId] || undefined,
      });

      toast({
        title: `Payment ${decisionLabel}`,
        description: `Payment ${paymentId.slice(0, 8)} has been ${decisionLabel}.`,
      });

      setNotes((previous) => ({ ...previous, [paymentId]: '' }));
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit approval decision';
      toast({
        title: 'Decision failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActingPaymentId(null);
    }
  };

  if (!canApprove) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldX className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Treasurer Approval Access Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Only treasurer and admin roles can approve or reject till-verified payments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Awaiting Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.awaitingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Awaiting Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.awaitingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.completedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.failedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Awaiting Treasurer Approval</CardTitle>
            <CardDescription>Approve valid till payments or reject suspicious submissions.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : awaitingPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments are waiting for approval.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awaitingPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono">{payment.phone}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {payment.mpesa_receipt || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <Textarea
                        value={notes[payment.id] || ''}
                        onChange={(event) =>
                          setNotes((previous) => ({
                            ...previous,
                            [payment.id]: event.target.value,
                          }))
                        }
                        placeholder="Reason for decision (optional)"
                        rows={2}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actingPaymentId === payment.id}
                          onClick={() => void handleDecision(payment.id, 'rejected')}
                        >
                          {actingPaymentId === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
                          <span className="ml-1">Reject</span>
                        </Button>
                        <Button
                          size="sm"
                          disabled={actingPaymentId === payment.id}
                          onClick={() => void handleDecision(payment.id, 'approved')}
                        >
                          {actingPaymentId === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span className="ml-1">Approve</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CboTreasurerApprovalPanel;
