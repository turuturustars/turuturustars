import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Smartphone, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

const WalletTopUpDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'form' | 'sent'>('form');

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) {
      toast({ title: 'Enter a valid amount', description: 'Minimum is KES 10', variant: 'destructive' });
      return;
    }
    if (!phone) {
      toast({ title: 'Phone required', variant: 'destructive' });
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
      });

      // Tag the mpesa_transactions row as wallet_topup so callback credits the wallet
      if (resp?.CheckoutRequestID) {
        await supabase
          .from('mpesa_transactions')
          .update({ transaction_type: 'wallet_topup' })
          .eq('checkout_request_id', resp.CheckoutRequestID);
      }

      setStage('sent');
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
            Add money to your wallet via M-Pesa STK Push. Funds appear once confirmed.
          </DialogDescription>
        </DialogHeader>

        {stage === 'form' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                min={10}
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_AMOUNTS.map((a) => (
                  <Button
                    key={a}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(a))}
                  >
                    KES {a.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>M-Pesa Phone</Label>
              <Input
                type="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending STK Push...
                </>
              ) : (
                <>Send STK Push</>
              )}
            </Button>
          </div>
        )}

        {stage === 'sent' && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <div>
              <p className="font-semibold">Check your phone</p>
              <p className="text-sm text-muted-foreground">
                Enter your M-Pesa PIN to complete the top-up. Your wallet balance will update automatically.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletTopUpDialog;
