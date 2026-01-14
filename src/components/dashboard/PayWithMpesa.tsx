import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Props {
  contributionId?: string;
  defaultAmount?: number | string;
  trigger?: React.ReactNode;
}

const PayWithMpesa = ({ contributionId, defaultAmount, trigger }: Props) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!phone || !amount) return;
    setIsProcessing(true);
    try {
      const formatted = formatPhoneNumber(phone);
      const result = await initiateSTKPush({
        phoneNumber: formatted,
        amount: Math.round(parseFloat(amount)),
        accountReference: contributionId || `C-${Date.now()}`,
        transactionDesc: 'Contribution Payment',
        contributionId,
      });

      if (result.ResponseCode === '0') {
        // record pending transaction
        await supabase.from('mpesa_transactions').insert({
          transaction_type: 'stk_push',
          checkout_request_id: result.CheckoutRequestID || null,
          mpesa_receipt_number: null,
          amount: Math.round(parseFloat(amount)),
          phone_number: formatted,
          status: 'pending',
          result_desc: result.ResponseDescription || null,
          initiated_by: profile?.id || null,
          member_id: profile?.id || null,
          contribution_id: contributionId || null,
        });

        toast({ title: 'Payment Initiated', description: 'Check your phone for the M-Pesa prompt' });
        setOpen(false);
      } else {
        throw new Error(result.ResponseDescription || 'STK Push failed');
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err?.message || 'Payment failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Pay with M-Pesa</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay with M-Pesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2547XXXXXXXX" />
          </div>
          <div className="space-y-1">
            <Label>Amount (KES)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={handlePay} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Send M-Pesa Prompt'}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayWithMpesa;
