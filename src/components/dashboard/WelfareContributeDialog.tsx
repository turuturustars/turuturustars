import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitPesapalOrder, getPesapalTransactionStatus } from '@/lib/pesapal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Heart, AlertCircle, Loader2, Info } from 'lucide-react';
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
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [hasRecordedContribution, setHasRecordedContribution] = useState(false);
  const [openedExternal, setOpenedExternal] = useState(false);

  const [firstName, lastName] = useMemo(() => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return [parts[0] || '', ''];
    return [parts[0], parts.slice(1).join(' ')];
  }, [fullName]);

  const validateAmount = (value: string): string | null => {
    if (!value.trim()) return 'Amount is required';
    const numAmount = Number.parseFloat(value);
    if (Number.isNaN(numAmount)) return 'Amount must be a number';
    if (numAmount < 1) return 'Minimum amount is KES 1';
    if (numAmount > 150000) return 'Maximum amount is KES 150,000';
    if (!Number.isInteger(numAmount)) return 'Amount must be a whole number';
    return null;
  };

  const amountError = touched.amount ? validateAmount(amount) : null;
  const isValid = !amountError && amount.trim() && fullName.trim() && email.trim();

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleContribute = async () => {
    if (!isValid) {
      toast.error('Please fix the errors before proceeding');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsProcessing(true);

    try {
      const numAmount = Math.round(Number.parseFloat(amount));
      setOrderAmount(numAmount);

      const callbackUrl = `${window.location.origin}/payment/pesapal/callback`;
      const result = await submitPesapalOrder({
        amount: numAmount,
        currency: 'KES',
        description: `Welfare: ${welfareCaseTitle}`,
        callbackUrl,
        memberId: user.id,
        billingAddress: {
          email_address: email.trim(),
          phone_number: phone.trim() || undefined,
          first_name: firstName || fullName.trim(),
          last_name: lastName,
        },
      });

      toast.success('Secure checkout ready');
      setCheckoutUrl(result.redirect_url);
      setOrderTrackingId(result.order_tracking_id);

      if (result.redirect_url && !openedExternal) {
        window.open(result.redirect_url, '_blank', 'noopener');
        setOpenedExternal(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process contribution';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!orderTrackingId) return;
    try {
      const data = await getPesapalTransactionStatus(orderTrackingId);
      const description = (data?.payment_status_description || '').toLowerCase();
      if (description.includes('completed')) {
        // Record contribution only after confirmed payment
        if (!hasRecordedContribution && orderAmount && user?.id) {
          const { data: contributionInsert, error } = await supabase
            .from('contributions')
            .insert({
              welfare_case_id: welfareCaseId,
              member_id: user.id,
              amount: orderAmount,
              notes: notes || null,
              contribution_type: 'welfare',
              status: 'paid',
              paid_at: new Date().toISOString(),
              reference_number: data?.confirmation_code ?? null,
            })
            .select('id')
            .single();

          if (!error && contributionInsert?.id) {
            await supabase
              .from('pesapal_transactions')
              .update({ contribution_id: contributionInsert.id })
              .eq('order_tracking_id', orderTrackingId);
            setHasRecordedContribution(true);
          } else if (error) {
            console.error('Failed to record contribution after payment', error);
            toast.error('Payment confirmed, but recording contribution failed. Contact support.');
          }
        }

        toast.success('Payment confirmed. Thank you!');
        setOpen(false);
        setCheckoutUrl(null);
        setOrderTrackingId(null);
        setOrderAmount(null);
        setHasRecordedContribution(false);
        onContributionSuccess?.();
        return true;
      } else if (description.includes('failed')) {
        toast.error('Payment failed or was cancelled.');
        setHasRecordedContribution(false);
        return true;
      } else {
        toast.message('Payment is still pending confirmation.');
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check payment status';
      toast.error(message);
      return false;
    }
  };

  useEffect(() => {
    if (!orderTrackingId || !checkoutUrl || !open) return;
    let attempts = 0;
    setIsPolling(true);
    const interval = setInterval(async () => {
      attempts += 1;
      const resolved = await handleCheckStatus();
      if (resolved || attempts >= 20) {
        setIsPolling(false);
        clearInterval(interval);
      }
    }, 7000);
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [orderTrackingId, checkoutUrl, open, handleCheckStatus]);

  const remainingAmount = targetAmount ? Math.max(0, targetAmount - collectedAmount) : null;

  useEffect(() => {
    if (!open) {
      setCheckoutUrl(null);
      setOrderTrackingId(null);
      setOpenedExternal(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full"
          >
            <Heart className="w-4 h-4" />
            Contribute
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Contribute to {welfareCaseTitle}
          </DialogTitle>
          <DialogDescription>
            Complete your welfare contribution securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {checkoutUrl ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Complete payment in the secure checkout below. A new tab may also be open for you.
              </div>
              <div className="w-full rounded-lg overflow-hidden border border-border bg-muted/10">
                <iframe
                  title="Secure Welfare Checkout"
                  src={checkoutUrl}
                  className="w-full h-[520px] bg-white"
                  allow="payment *"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleCheckStatus}>
                  {isPolling ? 'Checking payment status...' : 'I completed payment'}
                </Button>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline text-center"
                >
                  Open checkout in a new tab
                </a>
              </div>
            </div>
          ) : (
            <>
              {targetAmount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-blue-900 font-medium">
                      Remaining: KES {remainingAmount?.toLocaleString()}
                    </p>
                    <p className="text-blue-700 text-xs mt-1">
                      {collectedAmount > 0 && (
                        <>KES {collectedAmount.toLocaleString()} collected so far</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  className={cn(touched.fullName && !fullName.trim() && 'border-red-500 focus:ring-red-500')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={cn(touched.email && !email.trim() && 'border-red-500 focus:ring-red-500')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="07XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount (KES) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    KES
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    onBlur={() => handleBlur('amount')}
                    className={cn(
                      'pl-12',
                      touched.amount && amountError && 'border-red-500 focus:ring-red-500'
                    )}
                  />
                </div>
                {amountError && touched.amount && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {amountError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes (Optional)
                </Label>
                <textarea
                  id="notes"
                  placeholder="Add a message of support..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-16 text-sm"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                We’ll open a secure checkout where you can pay via Mobile Money, card, or bank.
              </div>

              <Button
                onClick={handleContribute}
                disabled={!isValid || isProcessing}
                className="w-full gap-2 bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4" />
                    Contribute Now
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelfareContributeDialog;
