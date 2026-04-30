import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Smartphone, Wallet, HandCoins, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import useWallet from '@/hooks/useWallet';
import type { KittyRow } from '@/hooks/useKitties';

interface Props {
  kitty: KittyRow;
  onContribute: (amount: number, notes?: string) => Promise<{ new_balance: number; reference: string }>;
}

const QUICK = [100, 500, 1000, 2000];

const KittyContributeDialog = ({ kitty, onContribute }: Props) => {
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [busy, setBusy] = useState(false);
  const [stkSent, setStkSent] = useState(false);

  const balance = Number(wallet?.balance || 0);
  const remaining = Math.max(0, Number(kitty.target_amount) - Number(kitty.balance));

  const reset = () => {
    setAmount('');
    setStkSent(false);
  };

  const payWithMpesa = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) return toast.error('Minimum is KES 10');
    if (!phone) return toast.error('Phone is required');
    if (!user?.id) return;

    setBusy(true);
    try {
      const formatted = formatPhoneNumber(phone);
      const resp = await initiateSTKPush({
        phoneNumber: formatted,
        amount: amt,
        accountReference: `KTY-${kitty.id.slice(0, 8)}`,
        transactionDesc: `Kitty: ${kitty.title.slice(0, 20)}`,
        memberId: user.id,
      });
      if (resp?.CheckoutRequestID) {
        await supabase
          .from('mpesa_transactions')
          .update({ transaction_type: 'kitty_contribution', kitty_id: kitty.id })
          .eq('checkout_request_id', resp.CheckoutRequestID);
      }
      setStkSent(true);
      toast.success('STK Push sent — check your phone');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'STK push failed');
    } finally {
      setBusy(false);
    }
  };

  const payWithWallet = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > balance) return toast.error('Insufficient wallet balance');
    setBusy(true);
    try {
      const res = await onContribute(amt, `Kitty: ${kitty.title}`);
      toast.success(`Contributed KES ${amt.toLocaleString()} • Ref: ${res.reference}`);
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Contribution failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={kitty.status !== 'active'}>
          <HandCoins className="w-4 h-4" /> Contribute
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contribute to {kitty.title}</DialogTitle>
          <DialogDescription>
            {remaining > 0
              ? `KES ${remaining.toLocaleString()} still needed to reach the target.`
              : 'Target reached — extra contributions still welcome.'}
          </DialogDescription>
        </DialogHeader>

        {stkSent ? (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="font-semibold">Check your phone</p>
            <p className="text-sm text-muted-foreground">
              Enter your M-Pesa PIN to complete. The kitty balance will update automatically.
            </p>
            <Button onClick={() => setOpen(false)} className="w-full">Done</Button>
          </div>
        ) : (
          <Tabs defaultValue="mpesa">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="mpesa" className="gap-2">
                <Smartphone className="w-4 h-4" /> M-Pesa
              </TabsTrigger>
              <TabsTrigger value="wallet" className="gap-2">
                <Wallet className="w-4 h-4" /> Wallet
              </TabsTrigger>
            </TabsList>

            <div className="space-y-2 pt-4">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                min={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((a) => (
                  <Button key={a} type="button" variant="outline" size="sm" onClick={() => setAmount(String(a))}>
                    KES {a.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <TabsContent value="mpesa" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label>M-Pesa Phone</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                />
              </div>
              <Button onClick={payWithMpesa} disabled={busy} className="w-full gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                Send STK Push
              </Button>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-3 pt-3">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet balance</span>
                  <span className="font-semibold">KES {balance.toLocaleString()}</span>
                </div>
              </div>
              <Button onClick={payWithWallet} disabled={busy} className="w-full gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Pay with Wallet
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {!stkSent && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KittyContributeDialog;
