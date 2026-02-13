import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useInteractionGuard } from '@/hooks/useInteractionGuard';
import { useToast } from '@/hooks/use-toast';
import {
  CboPayment,
  fetchPaymentByCheckoutId,
  fetchPaymentsForMember,
  formatCurrency,
  initiateStkPushPayment,
  submitTillPayment,
} from '@/lib/mpesaContributionsApi';
import { Loader2, RefreshCw, Smartphone, Wallet } from 'lucide-react';

const statusTone: Record<CboPayment['status'], string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  awaiting_approval: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  completed: 'bg-green-500/10 text-green-700 border-green-500/30',
  failed: 'bg-red-500/10 text-red-700 border-red-500/30',
};

const CboMpesaMemberPanel = () => {
  const { user, profile } = useAuth();
  const { canInteract, assertCanInteract, readOnlyMessage } = useInteractionGuard();
  const { toast } = useToast();

  const [stkPhone, setStkPhone] = useState(profile?.phone ?? '');
  const [stkAmount, setStkAmount] = useState('');
  const [stkLoading, setStkLoading] = useState(false);

  const [tillPhone, setTillPhone] = useState(profile?.phone ?? '');
  const [tillAmount, setTillAmount] = useState('');
  const [tillReceipt, setTillReceipt] = useState('');
  const [tillLoading, setTillLoading] = useState(false);

  const [payments, setPayments] = useState<CboPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [activeCheckoutId, setActiveCheckoutId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<CboPayment['status'] | null>(null);

  useEffect(() => {
    setStkPhone(profile?.phone ?? '');
    setTillPhone(profile?.phone ?? '');
  }, [profile?.phone]);

  const loadPayments = async () => {
    if (!user?.id) {
      setPayments([]);
      setLoadingPayments(false);
      return;
    }

    setLoadingPayments(true);
    try {
      const rows = await fetchPaymentsForMember(user.id, 20);
      setPayments(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payments';
      toast({
        title: 'Payment history error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, [user?.id]);

  useEffect(() => {
    if (!activeCheckoutId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const payment = await fetchPaymentByCheckoutId(activeCheckoutId);
        if (!payment) {
          return;
        }

        setActiveStatus(payment.status);
        if (payment.status === 'completed' || payment.status === 'failed') {
          setActiveCheckoutId(null);
          await loadPayments();
          toast({
            title: payment.status === 'completed' ? 'Payment completed' : 'Payment failed',
            description:
              payment.status === 'completed'
                ? `Receipt: ${payment.mpesa_receipt || 'Captured'}`
                : 'The M-Pesa request did not complete. You can retry.',
            variant: payment.status === 'completed' ? 'default' : 'destructive',
          });
        }
      } catch (error) {
        console.error('STK polling error', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeCheckoutId]);

  const totals = useMemo(() => {
    const completed = payments.filter((payment) => payment.status === 'completed');
    const pending = payments.filter((payment) => payment.status === 'pending' || payment.status === 'awaiting_approval');
    return {
      completedAmount: completed.reduce((sum, payment) => sum + payment.amount, 0),
      pendingAmount: pending.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [payments]);

  const handleStkPush = async () => {
    if (!assertCanInteract('initiate STK push')) return;

    const amount = Number(stkAmount);
    if (!stkPhone.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({
        title: 'Invalid STK input',
        description: 'Enter a valid phone and amount.',
        variant: 'destructive',
      });
      return;
    }

    setStkLoading(true);
    try {
      const result = await initiateStkPushPayment({
        phone: stkPhone,
        amount,
        accountReference: `CBO-${Date.now()}`,
        transactionDesc: 'CBO contribution',
      });

      setActiveCheckoutId(result.checkout_request_id);
      setActiveStatus('pending');
      setStkAmount('');

      toast({
        title: 'STK push sent',
        description: result.customer_message || 'Approve the payment prompt on your phone.',
      });

      await loadPayments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initiate STK push';
      toast({
        title: 'STK push failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setStkLoading(false);
    }
  };

  const handleTillSubmit = async () => {
    if (!assertCanInteract('submit till payment')) return;

    const amount = Number(tillAmount);
    if (!tillPhone.trim() || !tillReceipt.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({
        title: 'Invalid till submission',
        description: 'Phone, amount and receipt are required.',
        variant: 'destructive',
      });
      return;
    }

    setTillLoading(true);
    try {
      const result = await submitTillPayment({
        phone: tillPhone,
        amount,
        receipt: tillReceipt,
      });

      setTillAmount('');
      setTillReceipt('');

      toast({
        title: result.verification.status === 'verified' ? 'Till receipt verified' : 'Till receipt rejected',
        description: result.verification.reason,
        variant: result.verification.status === 'verified' ? 'default' : 'destructive',
      });

      await loadPayments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit till payment';
      toast({
        title: 'Till submission failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setTillLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!canInteract && readOnlyMessage && (
        <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {readOnlyMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5" />
              STK Push
            </CardTitle>
            <CardDescription>Send a payment prompt to your phone and complete with M-Pesa PIN.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="stk-phone">Phone Number</Label>
              <Input id="stk-phone" value={stkPhone} onChange={(event) => setStkPhone(event.target.value)} placeholder="07XXXXXXXX or 01XXXXXXXX" disabled={!canInteract} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stk-amount">Amount (KES)</Label>
              <Input id="stk-amount" type="number" min={1} value={stkAmount} onChange={(event) => setStkAmount(event.target.value)} placeholder="500" disabled={!canInteract} />
            </div>
            <Button onClick={handleStkPush} disabled={stkLoading || !canInteract} className="w-full">
              {stkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
              Initiate STK Push
            </Button>
            {activeCheckoutId && (
              <div className="rounded-md border p-3 text-sm bg-muted/40">
                <p className="font-medium">Checkout: {activeCheckoutId}</p>
                <p className="text-muted-foreground mt-1">Status: {activeStatus || 'pending'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5" />
              Manual Till Payment
            </CardTitle>
            <CardDescription>Submit your till receipt for automatic verification and treasurer approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="till-phone">Phone Number</Label>
              <Input id="till-phone" value={tillPhone} onChange={(event) => setTillPhone(event.target.value)} placeholder="07XXXXXXXX or 01XXXXXXXX" disabled={!canInteract} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="till-amount">Amount (KES)</Label>
              <Input id="till-amount" type="number" min={1} value={tillAmount} onChange={(event) => setTillAmount(event.target.value)} placeholder="500" disabled={!canInteract} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="till-receipt">M-Pesa Receipt</Label>
              <Input id="till-receipt" value={tillReceipt} onChange={(event) => setTillReceipt(event.target.value)} placeholder="RCK8Y2Q9M7" disabled={!canInteract} />
            </div>
            <Button onClick={handleTillSubmit} disabled={tillLoading || !canInteract} variant="secondary" className="w-full">
              {tillLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
              Submit Till Receipt
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.completedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending / Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">My Payment History</CardTitle>
            <CardDescription>Track status, receipts, and verification progress.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadPayments()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                    <TableCell className="uppercase">{payment.method}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="font-mono">{payment.mpesa_receipt || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone[payment.status]}>
                        {payment.status.replace('_', ' ')}
                      </Badge>
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

export default CboMpesaMemberPanel;
