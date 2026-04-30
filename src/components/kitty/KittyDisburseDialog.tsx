import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';
import type { KittyRow } from '@/hooks/useKitties';

interface Props {
  kitty: KittyRow;
  onDisburse: (params: { amount: number; purpose: string; recipient?: string; reference?: string }) => Promise<string>;
}

const KittyDisburseDialog = ({ kitty, onDisburse }: Props) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [recipient, setRecipient] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const balance = Number(kitty.balance);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > balance) return toast.error('Amount exceeds kitty balance');
    if (!purpose.trim()) return toast.error('Purpose is required');
    setBusy(true);
    try {
      await onDisburse({
        amount: amt,
        purpose: purpose.trim(),
        recipient: recipient.trim() || undefined,
        reference: reference.trim() || undefined,
      });
      toast.success(`Disbursed KES ${amt.toLocaleString()}`);
      setAmount('');
      setPurpose('');
      setRecipient('');
      setReference('');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Disbursement failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowDownToLine className="w-4 h-4" /> Disburse
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record a Disbursement</DialogTitle>
          <DialogDescription>
            Available balance: <span className="font-semibold">KES {balance.toLocaleString()}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (KES)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="What is this payout for?" />
          </div>
          <div className="space-y-2">
            <Label>Recipient (optional)</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Name or M-Pesa number" />
          </div>
          <div className="space-y-2">
            <Label>External reference (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="M-Pesa code or cheque #" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Disbursement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KittyDisburseDialog;
