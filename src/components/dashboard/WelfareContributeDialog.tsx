import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { MpesaTransactionService } from '@/lib/mpesaTransactionService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Heart, AlertCircle, Loader2, Info, Smartphone, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface WelfareContributeDialogProps {
  welfareCaseId: string;
  welfareCaseTitle: string;
  targetAmount?: number;
  collectedAmount?: number;
  trigger?: React.ReactNode;
  onContributionSuccess?: () => void;
}

type PaymentStep = 'form' | 'processing' | 'success';

const WelfareContributeDialog = ({
  welfareCaseId,
  welfareCaseTitle,
  targetAmount,
  collectedAmount = 0,
  trigger,
  onContributionSuccess,
}: WelfareContributeDialogProps) => {
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('form');
  const [statusMessage, setStatusMessage] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const remainingAmount = targetAmount ? Math.max(0, targetAmount - collectedAmount) : null;

  useEffect(() => {
    if (!open) {
      setPaymentStep('form');
      setStatusMessage('');
      setCheckoutRequestId(null);
      setSubmitError(null);
      setTouched({});
    }
  }, [open]);

  useEffect(() => {
    setPhone(profile?.phone || '');
  }, [profile?.phone]);

  const validateAmount = (value: string): string | null => {
    if (!value.trim()) return 'Amount is required';
    const numAmount = Number.parseFloat(value);
    if (Number.isNaN(numAmount)) return 'Amount must be a number';
    if (numAmount < 1) return 'Minimum amount is KES 1';
    if (numAmount > 150000) return 'Maximum amount is KES 150,000';
    if (!Number.isInteger(numAmount)) return 'Amount must be a whole number';
    return null;
  };

  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
    if (cleaned.length > 13) return 'Phone number is too long';
    if (!/^(254|0)?7\d{8}$/.test(cleaned)) return 'Use a valid M-Pesa line (07XXXXXXXX)';
    return null;
  };

  const amountError = touched.amount ? validateAmount(amount) : null;
  const phoneError = touched.phone ? validatePhone(phone) : null;
  const isValid = !amountError && !phoneError && amount.trim() && phone.trim();

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleContribute = async () => {
    if (!isValid) {
      setTouched({ amount: true, phone: true });
      toast.error('Please provide a valid phone and amount');
      return;
    }

    if (!user?.id) {
      toast.error('You must be signed in to contribute');
      return;
    }

    setIsProcessing(true);
    setSubmitError(null);

    let createdContributionId: string | null = null;
    let stkStarted = false;

    try {
      const numAmount = Math.round(Number.parseFloat(amount));

      const { data: contribution, error: contributionError } = await supabase
        .from('contributions')
        .insert({
          welfare_case_id: welfareCaseId,
          member_id: user.id,
          amount: numAmount,
          notes: notes.trim() || null,
          contribution_type: 'welfare',
          status: 'pending',
        })
        .select('id')
        .single();

      if (contributionError || !contribution?.id) {
        throw new Error('Failed to create contribution record');
      }

      createdContributionId = contribution.id;
      setPaymentStep('processing');
      setStatusMessage('Sending M-Pesa STK prompt...');

      const formattedPhone = formatPhoneNumber(phone);
      const result = await initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: numAmount,
        accountReference: `WLF-${welfareCaseId.slice(0, 8)}`,
        transactionDesc: `Welfare: ${welfareCaseTitle}`,
        memberId: user.id,
        contributionId: contribution.id,
      });

      if (result.ResponseCode !== '0') {
        throw new Error(result.ResponseDescription || 'Failed to initiate M-Pesa payment');
      }

      stkStarted = true;
      setCheckoutRequestId(result.CheckoutRequestID);
      setStatusMessage('Check your phone and enter your M-Pesa PIN.');

      toast.success('M-Pesa prompt sent to your phone');

      const transaction = await MpesaTransactionService.pollTransactionStatus(result.CheckoutRequestID, {
        onStatusChange: (status) => setStatusMessage(status),
      });

      if (!transaction || transaction.status !== 'completed') {
        throw new Error('Payment is still pending confirmation. Please check Payments page in a few moments.');
      }

      setPaymentStep('success');
      setStatusMessage('Contribution confirmed successfully.');
      toast.success('Contribution payment received. Thank you!');
      onContributionSuccess?.();

      setTimeout(() => {
        setOpen(false);
        setAmount('');
        setNotes('');
      }, 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process welfare contribution';
      setSubmitError(message);
      setPaymentStep('form');
      toast.error(message);

      if (!stkStarted && createdContributionId) {
        await supabase.from('contributions').delete().eq('id', createdContributionId).eq('status', 'pending');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800 w-full"
          >
            <Heart className="w-4 h-4" />
            Contribute via M-Pesa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-green-600" />
            Welfare Contribution
          </DialogTitle>
          <DialogDescription>
            Pay directly with M-Pesa STK push using your phone number.
          </DialogDescription>
        </DialogHeader>

        {paymentStep === 'success' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <p className="font-semibold text-green-900">Payment Successful</p>
            <p className="text-sm text-green-700">Your welfare contribution has been recorded.</p>
          </div>
        ) : paymentStep === 'processing' ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <p className="font-semibold text-blue-900">Processing M-Pesa payment</p>
            </div>
            <p className="text-sm text-blue-800">{statusMessage}</p>
            {checkoutRequestId && (
              <p className="text-xs font-mono text-blue-700 break-all">Checkout ID: {checkoutRequestId}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {targetAmount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-blue-900 font-medium">Remaining target: KES {remainingAmount?.toLocaleString()}</p>
                    {collectedAmount > 0 && (
                      <p className="text-blue-700 text-xs mt-1">KES {collectedAmount.toLocaleString()} already collected</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="welfare-phone" className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-600" />
                M-Pesa Phone Number
              </Label>
              <Input
                id="welfare-phone"
                type="text"
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={() => handleBlur('phone')}
                className={cn(touched.phone && phoneError && 'border-red-500 focus:ring-red-500')}
              />
              {touched.phone && phoneError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {phoneError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="welfare-amount" className="text-sm font-medium">
                Amount (KES)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">KES</span>
                <Input
                  id="welfare-amount"
                  type="text"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => handleBlur('amount')}
                  className={cn('pl-12', touched.amount && amountError && 'border-red-500 focus:ring-red-500')}
                />
              </div>
              {touched.amount && amountError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {amountError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="welfare-notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <textarea
                id="welfare-notes"
                placeholder="Add a message of support..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-16 text-sm"
              />
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{submitError}</div>
            )}

            <Button
              onClick={handleContribute}
              disabled={!isValid || isProcessing}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  Pay with M-Pesa
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WelfareContributeDialog;
