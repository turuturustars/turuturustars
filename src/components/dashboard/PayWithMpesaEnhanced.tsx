import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Smartphone,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  EyeOff,
  Clock,
  TrendingUp,
  ArrowRight,
  PhoneCall,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  contributionId?: string;
  defaultAmount?: number | string;
  paymentType?: string;
  trigger?: React.ReactNode;
  onPaymentSuccess?: (referenceId: string) => void;
}

const PayWithMpesa = ({
  contributionId,
  defaultAmount,
  paymentType,
  trigger,
  onPaymentSuccess,
}: Props) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPhone, setShowPhone] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');
  const [referenceId, setReferenceId] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(30);

  // Countdown timer for estimated time
  useEffect(() => {
    if (paymentStep === 'processing' && estimatedTime > 0) {
      const timer = setTimeout(() => setEstimatedTime(estimatedTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [paymentStep, estimatedTime]);

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
      setTouched({ phone: true, amount: true });
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');
    setEstimatedTime(30);

    try {
      const formatted = formatPhoneNumber(phone);
      const numAmount = Math.round(parseFloat(amount));
      const refId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      setReferenceId(refId);

      const result = await initiateSTKPush({
        phoneNumber: formatted,
        amount: numAmount,
        accountReference: contributionId || refId,
        transactionDesc: `${paymentType || 'Contribution'} Payment`,
        contributionId,
      });

      if (result.ResponseCode === '0') {
        // Record transaction
        await supabase.from('mpesa_transactions').insert({
          transaction_type: 'stk_push',
          checkout_request_id: result.CheckoutRequestID || null,
          mpesa_receipt_number: null,
          amount: numAmount,
          phone_number: formatted,
          status: 'initiated',
          result_desc: result.ResponseDescription || null,
          initiated_by: profile?.id || null,
          member_id: profile?.id || null,
          contribution_id: contributionId || null,
        });

        setTimeout(() => {
          setPaymentStep('success');
          if (onPaymentSuccess) {
            onPaymentSuccess(refId);
          }
          toast({
            title: '✓ Payment Initiated',
            description: `Check your phone (${formatted}) for the M-Pesa prompt`,
          });
        }, 1500);

        setTimeout(() => {
          handleOpenChange(false);
        }, 4000);
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
      setPaymentStep('form');
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
    if (!newOpen) {
      setPaymentStep('form');
      setErrors({});
      setTouched({});
      setReferenceId('');
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
      <DialogContent className="w-full max-w-md p-0 overflow-hidden">
        {paymentStep === 'success' ? (
          // Success State
          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-200 to-emerald-200 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
            <p className="text-sm text-gray-700 text-center mb-2">
              Payment of <span className="font-bold text-lg">KES {parseInt(amount).toLocaleString()}</span> initiated
            </p>
            <p className="text-xs text-gray-600 text-center mb-6">
              Check your phone ({phone.replace(/(.{3})(?=.{4})/g, '$1***')}) for the M-Pesa prompt
            </p>
            <Card className="w-full bg-white/80 border-green-200 mb-6">
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-gray-600 mb-2">Reference ID</p>
                <p className="font-mono text-sm font-bold text-green-700 break-all">{referenceId}</p>
              </CardContent>
            </Card>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => window.location.href = '/dashboard/payments'}
                className="flex-1 gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                View History
              </Button>
            </div>
          </div>
        ) : paymentStep === 'processing' ? (
          // Processing State
          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-[400px]">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6 animate-pulse">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h3>
            <p className="text-sm text-gray-700 text-center mb-6">
              Sending M-Pesa prompt to<br />
              <span className="font-semibold">{phone.replace(/(.{3})(?=.{4})/g, '$1***')}</span>
            </p>

            {/* Countdown Timer */}
            <Card className="w-full bg-white/80 border-blue-200 mb-6">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">
                    Check your phone in
                  </p>
                </div>
                <p className="text-4xl font-bold text-blue-600">{estimatedTime}s</p>
                <p className="text-xs text-gray-500 mt-3">
                  STK prompt will appear automatically
                </p>
              </CardContent>
            </Card>

            {/* Steps */}
            <div className="w-full space-y-3 mb-6">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">M-Pesa prompt arrives</p>
                  <p className="text-xs text-gray-600">You'll see it on your phone</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Enter M-Pesa PIN</p>
                  <p className="text-xs text-gray-600">Your 4-digit security code</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Confirmation received</p>
                  <p className="text-xs text-gray-600">Payment will be confirmed</p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setPaymentStep('form');
                setIsProcessing(false);
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        ) : (
          // Form State
          <>
            <DialogHeader className="p-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-base">Pay with M-Pesa</DialogTitle>
                  <p className="text-xs text-gray-600 mt-1">Fast, secure, and instant</p>
                </div>
                <Badge className="bg-green-100 text-green-800 gap-1">
                  <Shield className="w-3 h-3" />
                  Secure
                </Badge>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* Amount Summary */}
              {defaultAmount ? (
                <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-600 mb-2">Payment Amount</p>
                    <p className="text-3xl font-bold text-amber-900">
                      KES {parseInt(amount || '0').toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">
                    Amount (KES)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="amount"
                      type="text"
                      placeholder="Enter amount"
                      value={amount ? parseInt(amount).toLocaleString() : ''}
                      onChange={handleAmountChange}
                      onBlur={() => handleBlur('amount')}
                      className={cn(
                        'pl-10 text-lg font-semibold',
                        amountError && touched.amount && 'border-red-500 focus-visible:ring-red-200'
                      )}
                    />
                  </div>
                  {amountError && touched.amount && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {amountError}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Min: KES 1 • Max: KES 150,000
                  </p>
                </div>
              )}

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  M-Pesa Number
                </Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="text"
                    placeholder="+254 7xx xxx xxx"
                    value={showPhone ? phone : phone.replace(/\d(?=.{4})/g, '*')}
                    onChange={handlePhoneChange}
                    onBlur={() => handleBlur('phone')}
                    className={cn(
                      'pl-10 pr-10',
                      phoneError && touched.phone && 'border-red-500 focus-visible:ring-red-200'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPhone(!showPhone)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {phoneError && touched.phone && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Info Box */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 text-sm text-blue-900 space-y-2">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">How it works:</p>
                      <ol className="text-xs space-y-1 list-decimal list-inside">
                        <li>Enter your M-Pesa number</li>
                        <li>We'll send an STK prompt immediately</li>
                        <li>Enter your M-Pesa PIN to complete</li>
                        <li>Get instant confirmation</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={isProcessing || !isValid}
                  className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Pay KES {amount ? parseInt(amount).toLocaleString() : '0'}
                    </>
                  )}
                </Button>
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-500 text-center pt-2">
                <p className="flex items-center justify-center gap-1 mb-1">
                  <Shield className="w-3 h-3" />
                  Secure & encrypted
                </p>
                <p>Your data is protected with SSL encryption</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayWithMpesa;
