import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { initiateSTKPush, formatPhoneNumber, queryTransactionStatus } from '@/lib/mpesa';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock3, Loader2, RefreshCw, Smartphone, XCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

type TopUpStatus = 'idle' | 'pending' | 'checking' | 'completed' | 'failed' | 'timeout';

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

const statusCopy: Record<TopUpStatus, { title: string; detail: string; progress: number }> = {
  idle: {
    title: 'Ready',
    detail: 'Enter an amount and send the M-Pesa prompt.',
    progress: 0,
  },
  pending: {
    title: 'Waiting for M-Pesa confirmation',
    detail: 'Approve the STK prompt on your phone. This window will keep checking.',
    progress: 55,
  },
  checking: {
    title: 'Checking payment status',
    detail: 'Confirming the transaction with M-Pesa and syncing your wallet.',
    progress: 75,
  },
  completed: {
    title: 'Wallet top-up confirmed',
    detail: 'Your balance and transaction history have been refreshed.',
    progress: 100,
  },
  failed: {
    title: 'Top-up did not complete',
    detail: 'No wallet funds were added. You can try again when ready.',
    progress: 100,
  },
  timeout: {
    title: 'Still waiting for confirmation',
    detail: 'The prompt may have expired or M-Pesa is delayed. You can check again manually.',
    progress: 100,
  },
};

const formatKES = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);

const WalletTopUpDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'form' | 'sent'>('form');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<TopUpStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const numericAmount = useMemo(() => Number(amount) || 0, [amount]);
  const statusInfo = statusCopy[status];
  const isFinal = status === 'completed' || status === 'failed';
  const pollingFinished = isFinal || status === 'timeout';

  const refreshLocalTransaction = useCallback(async (checkoutId: string) => {
    const { data, error } = await supabase
      .from('mpesa_transactions')
      .select('status, result_desc, mpesa_receipt_number')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }, []);

  const checkStatus = useCallback(async () => {
    if (!checkoutRequestId) return;

    setStatus((current) => (current === 'completed' || current === 'failed' ? current : 'checking'));
    setStatusDetail(null);

    try {
      await queryTransactionStatus(checkoutRequestId);
    } catch (error) {
      setStatusDetail(error instanceof Error ? error.message : 'Unable to query M-Pesa right now.');
    }

    try {
      const transaction = await refreshLocalTransaction(checkoutRequestId);
      const currentStatus = transaction?.status || 'pending';
      setLastCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      if (currentStatus === 'completed') {
        setStatus((previous) => {
          if (previous !== 'completed') {
            toast({
              title: 'Wallet updated',
              description: 'Your top-up is now visible in your wallet transactions.',
            });
            onSuccess?.();
          }
          return 'completed';
        });
        setStatusDetail(transaction?.mpesa_receipt_number ? `Receipt ${transaction.mpesa_receipt_number}` : null);
        return;
      }

      if (currentStatus === 'failed' || currentStatus === 'user_cancelled') {
        setStatus('failed');
        setStatusDetail(transaction?.result_desc || 'The M-Pesa request was cancelled or failed.');
        onSuccess?.();
        return;
      }

      if (currentStatus === 'request_timeout' || currentStatus === 'timeout') {
        setStatus('timeout');
        setStatusDetail(transaction?.result_desc || 'The M-Pesa request timed out.');
        onSuccess?.();
        return;
      }

      setStatus('pending');
    } catch (error) {
      setStatus('pending');
      setStatusDetail(error instanceof Error ? error.message : 'Status check is temporarily unavailable.');
    }
  }, [checkoutRequestId, onSuccess, refreshLocalTransaction, toast]);

  useEffect(() => {
    if (stage !== 'sent' || !checkoutRequestId || pollingFinished) {
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      attempts += 1;

      if (attempts > 18) {
        setStatus('timeout');
        setStatusDetail('We are still waiting for M-Pesa. Use Check status to try again.');
        onSuccess?.();
        return;
      }

      await checkStatus();
    };

    const firstCheck = window.setTimeout(run, 2500);
    const interval = window.setInterval(run, 7000);

    return () => {
      cancelled = true;
      window.clearTimeout(firstCheck);
      window.clearInterval(interval);
    };
  }, [checkStatus, checkoutRequestId, onSuccess, pollingFinished, stage]);

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) {
      toast({ title: 'Enter a valid amount', description: 'Minimum is KES 10', variant: 'destructive' });
      return;
    }
    if (!phone) {
      toast({ title: 'Phone required', description: 'Enter the M-Pesa number to receive the prompt.', variant: 'destructive' });
      return;
    }
    if (!user?.id) return;

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const resp = await initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: amt,
        accountReference: `WALLET-${user.id.slice(0, 8)}`,
        transactionDesc: 'Wallet top-up',
        memberId: user.id,
        transactionType: 'wallet_topup',
      });

      setCheckoutRequestId(resp.CheckoutRequestID);
      setStage('sent');
      setStatus('pending');
      setStatusDetail(null);
      toast({
        title: 'STK Push sent',
        description: 'Check your phone and enter your M-Pesa PIN to complete the top-up.',
      });
      onSuccess?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to initiate payment';
      toast({ title: 'Top-up failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAmount('');
    setStage('form');
    setCheckoutRequestId(null);
    setStatus('idle');
    setStatusDetail(null);
    setLastCheckedAt(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Top Up Wallet
          </DialogTitle>
          <DialogDescription>
            Add funds with M-Pesa. Your wallet updates after confirmation.
          </DialogDescription>
        </DialogHeader>

        {stage === 'form' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-topup-amount">Amount</Label>
              <Input
                id="wallet-topup-amount"
                type="number"
                min={10}
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5">
                {QUICK_AMOUNTS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={numericAmount === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(String(value))}
                  >
                    {value.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-topup-phone">M-Pesa phone</Label>
              <Input
                id="wallet-topup-phone"
                type="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              {loading ? 'Sending prompt...' : `Send STK Push${numericAmount ? ` for ${formatKES(numericAmount)}` : ''}`}
            </Button>
          </div>
        )}

        {stage === 'sent' && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : status === 'failed' ? (
                    <XCircle className="h-8 w-8 text-destructive" />
                  ) : (
                    <Clock3 className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{statusInfo.title}</p>
                    <Badge variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
                      {status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{statusDetail || statusInfo.detail}</p>
                  <Progress value={statusInfo.progress} className="h-2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold tabular-nums">{formatKES(numericAmount)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Last check</p>
                <p className="font-semibold">{lastCheckedAt || 'Starting...'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {!isFinal && (
                <Button onClick={checkStatus} variant="outline" className="flex-1 gap-2" disabled={status === 'checking'}>
                  {status === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Check status
                </Button>
              )}
              {status === 'failed' && (
                <Button onClick={() => setStage('form')} variant="outline" className="flex-1">
                  Try again
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletTopUpDialog;
