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
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
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
      await spend({
        type,
        amount,
        description: description ?? `${type} payment`,
        contribution_id: contributionId,
        welfare_case_id: welfareCaseId,
        discipline_id: disciplineId,
      });

      // Side-effects per type — keep entities in sync
      try {
        if (type === 'dues' && contributionId) {
          await supabase
            .from('contributions')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              reference_number: 'WALLET',
            })
            .eq('id', contributionId);
        } else if (type === 'welfare' && welfareCaseId) {
          // Record contribution + bump collected amount
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
              reference_number: 'WALLET',
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
        // Wallet was debited but related entity update failed — surface but don't roll back here.
        toast.error('Payment debited but entity update failed. Contact treasurer.');
      }

      toast.success(`Paid KES ${amount.toLocaleString()} from wallet`);
      await refresh();
      await onAfterPay?.();
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      toast.error(msg);
    } finally {
      setProcessing(false);
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
    </AlertDialog>
  );
};

export default PayWithWalletButton;
