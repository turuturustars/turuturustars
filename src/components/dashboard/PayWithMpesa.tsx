import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { MpesaTransactionService } from '@/lib/mpesaTransactionService';
import { getFriendlyMpesaError, type UserFriendlyPaymentError } from '@/lib/paymentErrorMessages';
import { useAuth } from '@/hooks/useAuth';
import { useInteractionGuard } from '@/hooks/useInteractionGuard';
import { useToast } from '@/hooks/use-toast';
import {
  Smartphone,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  contributionId?: string;
  defaultAmount?: number | string;
  paymentType?: string;
  trigger?: React.ReactNode;
  onPaymentSuccess?: (referenceId: string) => void;
}

const SUPPORT_EMAIL = 'support@turuturu.co.ke';
const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

const formatKES = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);

const maskPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  return cleaned.replace(/\d(?=\d{4})/g, '*');
};

const formatPaymentLabel = (value?: string) => {
  if (!value) return 'Contribution payment';
  return `${value.replace(/_/g, ' ')} payment`;
};

const PayWithMpesa = ({
  contributionId,
  defaultAmount,
  paymentType,
  trigger,
  onPaymentSuccess,
}: Props) => {
  const { profile } = useAuth();
  const { assertCanInteract, canInteract } = useInteractionGuard();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<UserFriendlyPaymentError | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPhone, setShowPhone] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');
  const [referenceId, setReferenceId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    const timeout = pollingRef.current;
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  // Validation logic
  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
    if (cleaned.length > 13) return 'Phone number is too long';
    const phoneRegex = /^(254|0)?[17]\d{8}$/;
    if (!phoneRegex.exec(cleaned)) {
      return 'Invalid Kenyan phone number format. Use 07XXXXXXXX or 01XXXXXXXX';
    }
    return null;
  };

  const validateAmount = (value: string): string | null => {
    if (!value.trim()) return 'Amount is required';
    const numAmount = Number.parseFloat(value);
    if (Number.isNaN(numAmount)) return 'Amount must be a number';
    if (numAmount < 1) return 'Minimum amount is KES 1';
    if (numAmount > 150000) return 'Maximum amount is KES 150,000';
    if (!Number.isInteger(numAmount)) return 'Amount must be a whole number';
    return null;
  };

  const phoneError = touched.phone ? validatePhone(phone) : null;
  const amountError = touched.amount ? validateAmount(amount) : null;
  const isValid = !phoneError && !amountError && Boolean(phone.trim()) && Boolean(amount.trim());
  const numericAmount = Number.parseInt(amount || '0', 10) || 0;
  const formattedAmount = numericAmount ? formatKES(numericAmount) : 'KES 0';
  const maskedPhone = phone.trim() ? maskPhone(phone) : 'Not entered';
  const paymentLabel = formatPaymentLabel(paymentType);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Allow only numbers, +, and spaces
    value = value.replace(/[^\d+\s]/g, '');
    setPhone(value);
    setSubmitError(null);
    if (touched.phone) {
      const { phone: _, ...otherErrors } = errors;
      setErrors({
        ...otherErrors,
        phone: validatePhone(value) || ''
      });
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    const numericValue = value.replace(/[^\d]/g, '');
    setAmount(numericValue);
    setSubmitError(null);
    if (touched.amount) {
      const { amount: _, ...otherErrors } = errors;
      setErrors({
        ...otherErrors,
        amount: validateAmount(numericValue) || ''
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'phone') {
      setErrors(prev => ({
        ...prev,
        phone: validatePhone(phone) || ''
      }));
    } else if (field === 'amount') {
      setErrors(prev => ({
        ...prev,
        amount: validateAmount(amount) || ''
      }));
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(String(value));
    setSubmitError(null);
    setTouched((prev) => ({ ...prev, amount: true }));
  };

  const handlePay = async () => {
    if (!assertCanInteract('initiate payment')) return;

    if (!isValid) {
      // Mark all fields as touched to show errors
      setTouched({ phone: true, amount: true });
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');
    setSubmitError(null);
    setStatusMessage('Starting Pay with M-Pesa...');
    
    try {
      const formatted = formatPhoneNumber(phone);
      const numAmount = Math.round(Number.parseFloat(amount));

      const result = await initiateSTKPush({
        phoneNumber: formatted,
        amount: numAmount,
        accountReference: contributionId || `C-${Date.now()}`,
        transactionDesc: 'Contribution Payment',
        contributionId,
      });

      if (result.ResponseCode !== '0') {
        throw new Error(result.ResponseDescription || 'Failed to initiate payment');
      }

      const checkoutRequestId = result.CheckoutRequestID;
      setReferenceId(checkoutRequestId);

      toast({
        title: 'Pay with M-Pesa sent',
        description: `Check your phone (${formatted}) and enter your M-Pesa PIN within 30 seconds`,
      });

      // Poll for transaction status with improved handling
      setStatusMessage('Waiting for Pay with M-Pesa confirmation...');

      const completedTransaction = await MpesaTransactionService.pollTransactionStatus(
        checkoutRequestId,
        {
          onStatusChange: (status) => setStatusMessage(status),
          onSuccess: () => {
            setSuccess(true);
            setPaymentStep('success');
            onPaymentSuccess?.(checkoutRequestId);
          },
          onError: (error) => {
            throw error;
          },
        }
      );

      if (!completedTransaction) {
        // Transaction may still complete via callback
        setStatusMessage('Pay with M-Pesa is pending - check your phone');
        // Wait a bit more for callback
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalStatus = await MpesaTransactionService.getTransactionStatus(checkoutRequestId);
        if (finalStatus?.status === 'completed') {
          setSuccess(true);
          setPaymentStep('success');
          onPaymentSuccess?.(checkoutRequestId);
        }
      }

      // Reset form after a short confirmation moment.
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setPhone(profile?.phone || '');
        setAmount(defaultAmount ? String(defaultAmount) : '');
        setTouched({});
        setErrors({});
        setPaymentStep('form');
        setStatusMessage('');
      }, 3000);
    } catch (err) {
      const friendlyError = getFriendlyMpesaError(err);
      console.error('Payment error:', err);
      setSubmitError(friendlyError);
      toast({
        title: friendlyError.title,
        description: friendlyError.message,
        variant: 'destructive',
      });
      setPaymentStep('form');
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !canInteract) {
      assertCanInteract('open payment form');
      return;
    }

    setOpen(newOpen);
    // Reset on close
    if (!newOpen) {
      setSuccess(false);
      setErrors({});
      setSubmitError(null);
      setTouched({});
    }
  };

  const renderSuccessState = () => (
    <div className="flex flex-col items-center justify-center bg-green-50 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-in zoom-in">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful</h3>
      <p className="text-sm text-gray-600 mb-4">
        Your payment has been confirmed and recorded.
      </p>
      <div className="w-full rounded-xl border border-green-200 bg-white p-4 text-left text-sm shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Amount</span>
          <span className="font-semibold text-gray-950">{formattedAmount}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-gray-500">Phone</span>
          <span className="font-medium text-gray-800">{maskedPhone}</span>
        </div>
      </div>
      {referenceId && (
        <p className="mt-3 w-full rounded-lg bg-white/80 px-3 py-2 text-center font-mono text-xs text-gray-500">
          Ref: {referenceId}
        </p>
      )}
    </div>
  );

  const renderProcessingState = () => (
    <div className="flex flex-col items-center justify-center bg-cyan-50 p-8 min-h-[360px]">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-pulse">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Pay with M-Pesa in progress</h3>
      <p className="text-sm text-gray-600 text-center mb-5">
        {statusMessage || 'Waiting for Pay with M-Pesa confirmation...'}
      </p>
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">Amount</span>
            <span className="font-semibold text-gray-950">{formattedAmount}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">Phone</span>
            <span className="font-medium text-gray-800">{maskedPhone}</span>
          </div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-950">Check your phone</p>
              <p className="mt-1 text-xs leading-relaxed text-green-800">
                Enter your M-Pesa PIN when the prompt appears. Keep this window open while we confirm.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-gray-600">
          <div className="rounded-lg bg-white px-2 py-2 text-green-700">Sent</div>
          <div className="rounded-lg bg-white px-2 py-2 text-green-700">PIN</div>
          <div className="rounded-lg bg-white px-2 py-2">Confirmed</div>
        </div>
        {referenceId && (
          <div className="rounded-lg bg-white/80 px-3 py-2 text-center">
            <p className="text-[11px] text-gray-500">Reference</p>
            <p className="truncate font-mono text-xs text-gray-700">{referenceId}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFormState = () => (
    <>
      <DialogHeader className="p-6 pb-5 border-b border-green-100 bg-cyan-50">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-green-100 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg text-slate-950">Pay with M-Pesa</DialogTitle>
            <p className="text-xs text-blue-900/70 mt-1">Secure mobile money transfer</p>
          </div>
          <div className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            Fast
          </div>
        </div>
      </DialogHeader>

      <div className="p-6 space-y-5 bg-cyan-50">
        <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{paymentLabel}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-950">{formattedAmount}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-5 w-5 text-green-700" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-cyan-50 px-3 py-2">
              <p className="text-gray-500">Phone</p>
              <p className="mt-0.5 truncate font-semibold text-gray-800">{maskedPhone}</p>
            </div>
            <div className="rounded-lg bg-green-50 px-3 py-2">
              <p className="text-green-700">Confirmation</p>
              <p className="mt-0.5 font-semibold text-green-900">Automatic</p>
            </div>
          </div>
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2 font-semibold text-gray-900">
            <Smartphone className="w-4 h-4 text-green-600" />
            Phone Number
          </Label>
          <div className="relative">
            <Input
              id="phone"
              type={showPhone ? 'tel' : 'password'}
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={() => handleBlur('phone')}
              placeholder="07XXXXXXXX or 01XXXXXXXX"
              className={cn(
                'h-12 pr-10 text-base transition-all rounded-xl',
                phoneError && touched.phone
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                  : 'border-cyan-200 bg-cyan-50/70 focus:border-green-500 focus:ring-green-200'
              )}
            />
            {phone && (
              <button
                type="button"
                onClick={() => setShowPhone(!showPhone)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          {phoneError && touched.phone && (
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-600">{phoneError}</span>
            </div>
          )}
          {phone && !phoneError && touched.phone && (
            <p className="text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Valid phone number
            </p>
          )}
          {!touched.phone && (
            <p className="text-xs text-gray-500">Use the phone number that should receive the M-Pesa prompt.</p>
          )}
        </div>

        {/* Amount Field */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center gap-2 font-semibold text-gray-900">
            <DollarSign className="w-4 h-4 text-green-600" />
            Amount (KES)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              KES
            </span>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              onBlur={() => handleBlur('amount')}
              placeholder="1000"
              className={cn(
                'h-12 pl-12 text-base transition-all rounded-xl',
                amountError && touched.amount
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                  : 'border-cyan-200 bg-cyan-50/70 focus:border-green-500 focus:ring-green-200'
              )}
            />
          </div>
          {amountError && touched.amount && (
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-600">{amountError}</span>
            </div>
          )}
          {amount && !amountError && touched.amount && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Valid amount
              </p>
              {amount && <p className="text-xs font-semibold text-gray-900">KES {Number.parseInt(amount).toLocaleString()}</p>}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Min: KES 1 • Max: KES 150,000</p>
          {!defaultAmount && (
            <div className="grid grid-cols-5 gap-2 pt-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleQuickAmount(value)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-semibold transition-colors',
                    numericAmount === value
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-green-200 bg-white text-green-700 hover:bg-green-50'
                  )}
                >
                  {value >= 1000 ? `${value / 1000}k` : value}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-green-600" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-950">What happens next</p>
            <div className="grid grid-cols-3 gap-2 text-[11px] leading-tight text-green-800">
              <span className="rounded-md bg-white px-2 py-2">Prompt appears</span>
              <span className="rounded-md bg-white px-2 py-2">Enter PIN</span>
              <span className="rounded-md bg-white px-2 py-2">Auto confirm</span>
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-950">{submitError.title}</p>
                <p className="text-sm leading-relaxed text-red-800 mt-1">{submitError.message}</p>
                {submitError.reassurance && (
                  <p className="text-xs leading-relaxed text-red-700 mt-2 bg-white/70 rounded-lg px-3 py-2">
                    {submitError.reassurance}
                  </p>
                )}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 hover:underline mt-3"
                >
                  <Mail className="w-3 h-3" />
                  Contact support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <AccessibleButton
            onClick={handlePay}
            disabled={!isValid || isProcessing}
            isLoading={isProcessing}
            loadingText="Opening Pay with M-Pesa"
            ariaLabel="Pay with M-Pesa"
            className={cn(
              'h-12 flex-1 gap-2 bg-green-600 font-semibold text-white transition-all hover:bg-green-700 focus-visible:ring-green-500',
              isProcessing && 'opacity-90'
            )}
          >
            {!isProcessing && (
              <>
                {submitError ? <RefreshCw className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                {submitError ? 'Try Again' : 'Pay with M-Pesa'}
              </>
            )}
          </AccessibleButton>
          <AccessibleButton
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isProcessing}
            ariaLabel="Cancel payment"
            className="h-12 px-4 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            Cancel
          </AccessibleButton>
        </div>

        {/* Footer Help Text */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Having trouble? Contact support at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-green-700 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <AccessibleButton className="gap-2 bg-green-600 text-white hover:bg-green-700" ariaLabel="Pay with M-Pesa">
            <Smartphone className="w-4 h-4" />
            Pay with M-Pesa
          </AccessibleButton>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 overflow-hidden border border-green-100 bg-cyan-50 shadow-2xl sm:rounded-2xl">
        <DialogDescription className="sr-only">
          Pay with M-Pesa dialog for Turuturu Stars contributions
        </DialogDescription>
        {success && renderSuccessState()}
        {!success && paymentStep === 'processing' && renderProcessingState()}
        {!success && paymentStep === 'form' && renderFormState()}
      </DialogContent>
    </Dialog>
  );
};

export default PayWithMpesa;
