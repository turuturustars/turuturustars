import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, CheckCircle2, Copy } from 'lucide-react';
import useWallet from '@/hooks/useWallet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type SpendType = 'dues' | 'welfare' | 'fine';

interface PayWithWalletButtonProps {
  amount: number;
  type: SpendType;
  description?: string;
  contributionId?: string;
  welfareCaseId?: string;
  disciplineId?: string;
  /** Optional side-effects to run after a successful debit (e.g. mark contribution paid). */
  onAfterPay?: () => Promise<void> | void;
  buttonLabel?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

const PayWithWalletButton = ({
  amount,
  type,
  description,
  contributionId,
  welfareCaseId,
  disciplineId,
  onAfterPay,
  buttonLabel = 'Pay with Wallet',
  size = 'sm',
  className,
  variant = 'outline',
  fullWidth,
}: PayWithWalletButtonProps) => {
  const { wallet, spend, refresh } = useWallet();
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReference, setLastReference] = useState<string | null>(null);
  const [lastAmount, setLastAmount] = useState<number>(0);
  const [lastType, setLastType] = useState<SpendType>('dues');

  const balance = Number(wallet?.balance || 0);
  const insufficient = balance < amount;
  const validAmount = amount > 0;

  const handleConfirm = async () => {
    if (!validAmount) {
      toast.error('Invalid payment amount');
      return;
    }
    setProcessing(true);
    try {
      const { reference } = await spend({
        type,
        amount,
        description: description ?? `${type} payment`,
        contribution_id: contributionId,
        welfare_case_id: welfareCaseId,
        discipline_id: disciplineId,
      });

      // Side-effects per type — keep entities in sync (store wallet ref so it's traceable)
      try {
        if (type === 'dues' && contributionId) {
          await supabase
            .from('contributions')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              reference_number: reference,
            })
            .eq('id', contributionId);
        } else if (type === 'welfare' && welfareCaseId) {
          const { data: userRes } = await supabase.auth.getUser();
          const memberId = userRes.user?.id;
          if (memberId) {
            await supabase.from('contributions').insert({
              welfare_case_id: welfareCaseId,
              member_id: memberId,
              amount,
              contribution_type: 'welfare',
              status: 'paid',
              paid_at: new Date().toISOString(),
              reference_number: reference,
              notes: description ?? 'Wallet contribution',
            });
            const { data: wc } = await supabase
              .from('welfare_cases')
              .select('collected_amount')
              .eq('id', welfareCaseId)
              .maybeSingle();
            const current = Number(wc?.collected_amount || 0);
            await supabase
              .from('welfare_cases')
              .update({ collected_amount: current + amount })
              .eq('id', welfareCaseId);
          }
        } else if (type === 'fine' && disciplineId) {
          await supabase
            .from('discipline_records')
            .update({ fine_paid: true, paid_at: new Date().toISOString() })
            .eq('id', disciplineId);
        }
      } catch (sideErr) {
        console.error('Wallet side-effect error:', sideErr);
        toast.error('Payment debited but entity update failed. Contact treasurer.');
      }

      setLastReference(reference);
      setLastAmount(amount);
      setLastType(type);
      toast.success(`Paid KES ${amount.toLocaleString()} • Ref: ${reference}`);
      await refresh();
      await onAfterPay?.();
      setOpen(false);
      setReceiptOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const copyRef = async () => {
    if (!lastReference) return;
    try {
      await navigator.clipboard.writeText(lastReference);
      toast.success('Reference copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          className={`gap-2 ${fullWidth ? 'w-full' : ''} ${className || ''}`}
          disabled={!validAmount}
        >
          <Wallet className="w-4 h-4" />
          {buttonLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Pay with Wallet
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>{description || `Pay for ${type} from your wallet balance.`}</p>
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">KES {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet balance</span>
                  <span className={insufficient ? 'text-destructive font-semibold' : 'font-semibold'}>
                    KES {balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">After payment</span>
                  <span className="font-semibold">
                    KES {Math.max(0, balance - amount).toLocaleString()}
                  </span>
                </div>
              </div>
              {insufficient && (
                <p className="text-destructive">
                  Insufficient balance. Top up your wallet before paying.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={insufficient || processing || !validAmount}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
              </>
            ) : (
              'Confirm Payment'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Success receipt with reference number */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Payment Successful
            </DialogTitle>
            <DialogDescription>
              Your wallet payment for{' '}
              {lastType === 'dues' ? 'monthly dues' : lastType === 'welfare' ? 'welfare contribution' : 'fine'} was completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount paid</span>
                <span className="font-semibold">KES {lastAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Reference</span>
                <button
                  type="button"
                  onClick={copyRef}
                  className="font-mono text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline"
                  title="Copy reference"
                >
                  {lastReference}
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New balance</span>
                <span className="font-semibold">KES {Number(wallet?.balance || 0).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this reference for your records. You can also find it in your wallet transactions.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setReceiptOpen(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AlertDialog>
  );
};

export default PayWithWalletButton;
