import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, HandCoins, Loader2, RefreshCw, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { useAuth } from '@/hooks/useAuth';
import { useTransactionStatus } from '@/hooks/useTransactionStatus';
import useWallet from '@/hooks/useWallet';
import type { KittyRow } from '@/hooks/useKitties';
import { cn } from '@/lib/utils';
import { formatKes, getKittyRemaining } from '@/lib/kittyUtils';

interface Props {
  kitty: KittyRow;
  onContribute: (amount: number, notes?: string) => Promise<{ new_balance: number; reference: string }>;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

const KittyContributeDialog = ({ kitty, onContribute }: Props) => {
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [busy, setBusy] = useState(false);
  const [stkSent, setStkSent] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const { transaction, isLoading: statusLoading, refresh: refreshStatus } = useTransactionStatus(checkoutRequestId);

  const walletBalance = Number(wallet?.balance || 0);
  const amountValue = Number(amount);
  const amountIsValid = Number.isFinite(amountValue) && amountValue > 0;
  const remaining = getKittyRemaining(kitty.balance, kitty.target_amount);
  const isActive = kitty.status === 'active';
  const quickAmounts = useMemo(() => {
    const values = new Set(QUICK_AMOUNTS);
    if (remaining > 0 && remaining <= 5000) values.add(Math.round(remaining));
    return Array.from(values).sort((a, b) => a - b);
  }, [remaining]);

  useEffect(() => {
    if (!phone && profile?.phone) setPhone(profile.phone);
  }, [phone, profile?.phone]);

  const reset = () => {
    setAmount('');
    setStkSent(false);
    setCheckoutRequestId(null);
  };

  const payWithMpesa = async () => {
    if (!isActive) return toast.error('This kitty is not accepting contributions');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 10) return toast.error('Minimum M-Pesa contribution is KES 10');
    if (!phone.trim()) return toast.error('Phone is required');
    if (!user?.id) return toast.error('Not signed in');

    setBusy(true);
    try {
      const formatted = formatPhoneNumber(phone);
      const response = await initiateSTKPush({
        phoneNumber: formatted,
        amount: amt,
        accountReference: `KTY-${kitty.id.slice(0, 8)}`,
        transactionDesc: `Kitty: ${kitty.title.slice(0, 20)}`,
        memberId: user.id,
        transactionType: 'kitty_contribution',
        kittyId: kitty.id,
      });

      setCheckoutRequestId(response.CheckoutRequestID);
      setStkSent(true);
      toast.success('STK Push sent. Check your phone.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'STK push failed'));
    } finally {
      setBusy(false);
    }
  };

  const payWithWallet = async () => {
    if (!isActive) return toast.error('This kitty is not accepting contributions');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > walletBalance) return toast.error('Insufficient wallet balance');
    setBusy(true);
    try {
      const result = await onContribute(amt, `Kitty contribution: ${kitty.title}`);
      toast.success(`Contributed ${formatKes(amt)}. Ref: ${result.reference}`);
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Contribution failed'));
    } finally {
      setBusy(false);
    }
  };

  const transactionStatus = transaction?.status || 'pending';
  const transactionComplete = transaction?.isComplete;
  const transactionFailed = transaction?.isFailed;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={!isActive}>
          <HandCoins className="h-4 w-4" /> Contribute
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contribute to {kitty.title}</DialogTitle>
          <DialogDescription>
            {remaining > 0 ? `${formatKes(remaining)} still needed to reach the target.` : 'Target reached. Extra support is still tracked.'}
          </DialogDescription>
        </DialogHeader>

        {stkSent ? (
          <div className="space-y-4 py-4 text-center">
            <div className="flex justify-center">
              {transactionComplete ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              ) : transactionFailed ? (
                <Clock className="h-12 w-12 text-destructive" />
              ) : (
                <Clock className="h-12 w-12 text-amber-500" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                {transactionComplete ? 'Payment received' : transactionFailed ? 'Payment not completed' : 'Waiting for confirmation'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {transactionComplete
                  ? 'The kitty balance will refresh automatically.'
                  : 'Enter your M-Pesa PIN on your phone, then wait for the confirmation.'}
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-left text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={transactionComplete ? 'default' : transactionFailed ? 'destructive' : 'secondary'} className="capitalize">
                  {transactionStatus.replace('_', ' ')}
                </Badge>
              </div>
              {checkoutRequestId && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Checkout ID</span>
                  <span className="truncate font-mono text-xs">{checkoutRequestId}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
              <Button variant="outline" onClick={refreshStatus} disabled={statusLoading} className="gap-2">
                <RefreshCw className={cn('h-4 w-4', statusLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="mpesa">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="mpesa" className="gap-2">
                <Smartphone className="h-4 w-4" /> M-Pesa
              </TabsTrigger>
              <TabsTrigger value="wallet" className="gap-2">
                <Wallet className="h-4 w-4" /> Wallet
              </TabsTrigger>
            </TabsList>

            <div className="space-y-2 pt-4">
              <Label htmlFor="kitty-contribution-amount">Amount (KES)</Label>
              <Input
                id="kitty-contribution-amount"
                type="number"
                inputMode="numeric"
                min={10}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="500"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(quickAmount))}
                  >
                    {formatKes(quickAmount)}
                  </Button>
                ))}
              </div>
            </div>

            <TabsContent value="mpesa" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="kitty-mpesa-phone">M-Pesa phone</Label>
                <Input
                  id="kitty-mpesa-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="07XX XXX XXX"
                />
              </div>
              <Button onClick={payWithMpesa} disabled={busy || !amountIsValid} className="w-full gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                Send STK Push
              </Button>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-3 pt-3">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Wallet balance</span>
                  <span className="font-semibold">{formatKes(walletBalance)}</span>
                </div>
                {amountIsValid && (
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-muted-foreground">Balance after</span>
                    <span className="font-semibold">{formatKes(Math.max(0, walletBalance - amountValue))}</span>
                  </div>
                )}
              </div>
              <Button
                onClick={payWithWallet}
                disabled={busy || !amountIsValid || amountValue > walletBalance}
                className="w-full gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Pay with Wallet
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {!stkSent && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KittyContributeDialog;
