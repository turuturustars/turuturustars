import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitPesapalOrder, getPesapalTransactionStatus } from '@/lib/pesapal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, DollarSign, AlertCircle, ShieldCheck, CreditCard, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  contributionId?: string;
  defaultAmount?: number | string;
  paymentType?: string;
  trigger?: React.ReactNode;
  onPaymentInitiated?: (orderTrackingId: string) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PayWithPesapal = ({
  contributionId,
  defaultAmount,
  paymentType,
  trigger,
  onPaymentInitiated,
}: Props) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preferredMethod, setPreferredMethod] = useState<'mobile' | 'card' | 'bank'>('mobile');
  const [openedExternal, setOpenedExternal] = useState(false);

  const [firstName, lastName] = useMemo(() => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return [parts[0] || '', ''];
    return [parts[0], parts.slice(1).join(' ')];
  }, [fullName]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required';
    if (!email.trim() || !emailRegex.test(email.trim())) nextErrors.email = 'Valid email is required';
    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      nextErrors.amount = 'Enter a valid amount';
    }
    if (!phone.trim()) nextErrors.phone = 'Phone number is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePay = async () => {
    if (!validate()) return;

    setIsProcessing(true);
    try {
      const callbackUrl = `${window.location.origin}/payment/pesapal/callback`;
      const methodLabel =
        preferredMethod === 'mobile'
          ? 'Mobile Money'
          : preferredMethod === 'card'
            ? 'Card'
            : 'Bank/Transfer';

      const result = await submitPesapalOrder({
        amount: Number(amount),
        currency: 'KES',
        description: `${paymentType || 'Contribution Payment'} - ${methodLabel}`,
        callbackUrl,
        contributionId,
        billingAddress: {
          email_address: email.trim(),
          phone_number: phone.trim(),
          first_name: firstName || fullName.trim(),
          last_name: lastName,
        },
      });

      toast({
        title: 'Secure checkout ready',
        description: 'Complete the payment in the secure window that just opened.',
      });

      onPaymentInitiated?.(result.order_tracking_id);
      setOrderTrackingId(result.order_tracking_id);
      setCheckoutUrl(result.redirect_url);

      if (result.redirect_url && !openedExternal) {
        window.open(result.redirect_url, '_blank', 'noopener');
        setOpenedExternal(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment initiation failed';
      setErrors((prev) => ({ ...prev, submit: message }));
      toast({
        title: 'Payment Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setErrors({});
      setCheckoutUrl(null);
      setOrderTrackingId(null);
      setOpenedExternal(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!orderTrackingId) return;
    try {
      const data = await getPesapalTransactionStatus(orderTrackingId);
      const description = (data?.payment_status_description || '').toLowerCase();
      if (description.includes('completed')) {
        toast({
          title: 'Payment Confirmed',
          description: 'Your payment was completed successfully.',
        });
        setOpen(false);
        return true;
      } else if (description.includes('failed')) {
        toast({
          title: 'Payment Failed',
          description: 'Payment failed or was cancelled. Please try again.',
          variant: 'destructive',
        });
        return true;
      } else {
        toast({
          title: 'Payment Pending',
          description: 'Payment is still pending confirmation.',
        });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check payment status';
      toast({
        title: 'Status Check Failed',
        description: message,
        variant: 'destructive',
      });
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
  }, [orderTrackingId, checkoutUrl, open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <AccessibleButton className="gap-2" ariaLabel="Make a secure payment">
            <Smartphone className="w-4 h-4" />
            Pay Now
          </AccessibleButton>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Secure checkout – choose your preferred payment method in the next step.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {checkoutUrl ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Complete payment in the secure checkout below. If a new tab opened, you can finish there instead.
              </div>
              <div className="w-full rounded-lg overflow-hidden border border-border bg-muted/10">
                <iframe
                  title="Secure Checkout"
                  src={checkoutUrl}
                  className="w-full h-[520px] bg-white"
                  allow="payment *"
                />
              </div>
              <div className="flex flex-col gap-2">
                <AccessibleButton variant="outline" onClick={handleCheckStatus} ariaLabel="Check payment status">
                  {isPolling ? 'Checking payment status...' : 'I completed payment'}
                </AccessibleButton>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline text-center"
                >
                  Open secure checkout in a new tab
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Payments are processed securely. You’ll select Mobile Money, Card, or Bank inside checkout.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={cn(errors.fullName && 'border-red-500')}
                  placeholder="Your name"
                />
                {errors.fullName && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(errors.email && 'border-red-500')}
                  placeholder="name@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={cn(errors.phone && 'border-red-500')}
                  placeholder="07XXXXXXXX"
                />
                {errors.phone && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    KES
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    className={cn('pl-12', errors.amount && 'border-red-500')}
                    placeholder="1000"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.amount}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'mobile' as const, label: 'Mobile Money (M-Pesa/Airtel)', icon: Smartphone },
                    { key: 'card' as const, label: 'Debit/Credit Card', icon: CreditCard },
                    { key: 'bank' as const, label: 'Bank / Transfer', icon: Radio },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreferredMethod(key)}
                      className={cn(
                        'flex items-center gap-3 border rounded-lg px-3 py-2 text-left transition-all',
                        preferredMethod === key
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      )}
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              <AccessibleButton
                onClick={handlePay}
                disabled={isProcessing}
                isLoading={isProcessing}
                loadingText="Redirecting..."
                ariaLabel="Proceed to secure checkout"
                className="w-full gap-2"
              >
                {!isProcessing && (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Start Secure Checkout
                  </>
                )}
              </AccessibleButton>

              <div className="text-[11px] text-muted-foreground text-center">
                We use a PCI-DSS compliant gateway; no card or mobile details are stored here.
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayWithPesapal;
