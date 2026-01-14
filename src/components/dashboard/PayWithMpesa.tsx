import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPhone, setShowPhone] = useState(false);

  // Validation logic
  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
    if (cleaned.length > 13) return 'Phone number is too long';
    if (!cleaned.match(/^(254|0)?7\d{8}$/)) {
      return 'Invalid Kenyan phone number format';
    }
    return null;
  };

  const validateAmount = (value: string): string | null => {
    if (!value.trim()) return 'Amount is required';
    const numAmount = parseFloat(value);
    if (isNaN(numAmount)) return 'Amount must be a number';
    if (numAmount < 1) return 'Minimum amount is KES 1';
    if (numAmount > 150000) return 'Maximum amount is KES 150,000';
    if (!Number.isInteger(numAmount)) return 'Amount must be a whole number';
    return null;
  };

  const phoneError = touched.phone ? validatePhone(phone) : null;
  const amountError = touched.amount ? validateAmount(amount) : null;
  const isValid = !phoneError && !amountError && phone.trim() && amount.trim();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Allow only numbers, +, and spaces
    value = value.replace(/[^\d+\s]/g, '');
    setPhone(value);
    if (touched.phone) {
      setErrors(prev => ({
        ...prev,
        phone: validatePhone(value) || ''
      }));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    const numericValue = value.replace(/[^\d]/g, '');
    setAmount(numericValue);
    if (touched.amount) {
      setErrors(prev => ({
        ...prev,
        amount: validateAmount(numericValue) || ''
      }));
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

  const handlePay = async () => {
    if (!isValid) {
      // Mark all fields as touched to show errors
      setTouched({ phone: true, amount: true });
      return;
    }

    setIsProcessing(true);
    try {
      const formatted = formatPhoneNumber(phone);
      const numAmount = Math.round(parseFloat(amount));

      const result = await initiateSTKPush({
        phoneNumber: formatted,
        amount: numAmount,
        accountReference: contributionId || `C-${Date.now()}`,
        transactionDesc: 'Contribution Payment',
        contributionId,
      });

      if (result.ResponseCode === '0') {
        // Record pending transaction
        await supabase.from('mpesa_transactions').insert({
          transaction_type: 'stk_push',
          checkout_request_id: result.CheckoutRequestID || null,
          mpesa_receipt_number: null,
          amount: numAmount,
          phone_number: formatted,
          status: 'pending',
          result_desc: result.ResponseDescription || null,
          initiated_by: profile?.id || null,
          member_id: profile?.id || null,
          contribution_id: contributionId || null,
        });

        setSuccess(true);
        toast({
          title: '✓ Payment Initiated',
          description: `Check your phone (${formatted}) for the M-Pesa prompt within 30 seconds`,
        });

        // Reset form after 2 seconds
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setPhone(profile?.phone || '');
          setAmount(defaultAmount ? String(defaultAmount) : '');
          setTouched({});
          setErrors({});
        }, 2000);
      } else {
        throw new Error(result.ResponseDescription || 'Failed to initiate payment');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err?.message || 'Payment initiation failed';
      setErrors(prev => ({
        ...prev,
        submit: errorMessage
      }));
      toast({
        title: '✗ Payment Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Reset on close
    if (!newOpen) {
      setSuccess(false);
      setErrors({});
      setTouched({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Smartphone className="w-4 h-4" />
            Pay with M-Pesa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-sm p-0 overflow-hidden">
        {success ? (
          // Success State
          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-in zoom-in">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Initiated!</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Check your phone for the M-Pesa prompt within 30 seconds
            </p>
            <p className="text-xs text-gray-500 text-center">
              Closing dialog in a moment...
            </p>
          </div>
        ) : (
          // Form State
          <>
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Pay with M-Pesa</DialogTitle>
                  <p className="text-xs text-gray-500 mt-1">Secure mobile money transfer</p>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  You'll receive an M-Pesa prompt on your registered phone number. Enter your PIN to complete the payment.
                </p>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 font-semibold text-gray-900">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  Phone Number
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => handleBlur('phone')}
                    placeholder="254712345678 or 07XXXXXXXX"
                    className={cn(
                      'pr-10 text-base transition-all',
                      phoneError && touched.phone
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
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
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    ✓ Valid phone number
                  </p>
                )}
              </div>

              {/* Amount Field */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2 font-semibold text-gray-900">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  Amount (KES)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    KES
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    onBlur={() => handleBlur('amount')}
                    placeholder="1000"
                    className={cn(
                      'pl-12 text-base transition-all',
                      amountError && touched.amount
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
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
                    <p className="text-xs text-green-600">✓ Valid amount</p>
                    {amount && <p className="text-xs font-semibold text-gray-900">KES {parseInt(amount).toLocaleString()}</p>}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">Min: KES 1 • Max: KES 150,000</p>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handlePay}
                  disabled={!isValid || isProcessing}
                  className={cn(
                    'flex-1 gap-2 font-semibold transition-all',
                    isProcessing && 'opacity-90'
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Send M-Pesa Prompt
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isProcessing}
                  className="px-4"
                >
                  Cancel
                </Button>
              </div>

              {/* Footer Help Text */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Having trouble? Contact support at{' '}
                  <a href="mailto:support@turuturu.co.ke" className="text-blue-600 hover:underline">
                    support@turuturu.co.ke
                  </a>
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayWithMpesa;
