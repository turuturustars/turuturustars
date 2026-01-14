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
  Radio,
  Package,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentProduct {
  id: string;
  name: string;
  description: string;
  amount: number;
  icon: string;
}

interface SuccessData {
  subscriptionId: string;
  expiryDate: string;
  method: 'lipa' | 'till';
}

interface Props {
  contributionId?: string;
  defaultAmount?: number | string;
  trigger?: React.ReactNode;
}

const PAYMENT_PRODUCTS: PaymentProduct[] = [
  {
    id: 'internet-1',
    name: 'Unlimited Internet, 40 Min',
    description: 'High-speed internet + calling minutes',
    amount: 10,
    icon: '📡'
  },
  {
    id: 'internet-2',
    name: 'Unlimited Internet, 1 Hour',
    description: 'Premium high-speed internet',
    amount: 20,
    icon: '📡'
  },
  {
    id: 'sms-bundle',
    name: 'SMS Bundle 100 + 100MB',
    description: 'Text messages + mobile data',
    amount: 15,
    icon: '💬'
  },
  {
    id: 'airtime',
    name: 'Custom Airtime',
    description: 'Choose your own amount',
    amount: 0,
    icon: '📞'
  }
];

const PayWithMpesa = ({ contributionId, defaultAmount, trigger }: Props) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'lipa' | 'till'>('lipa');
  const [selectedProduct, setSelectedProduct] = useState<PaymentProduct | null>(null);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPhone, setShowPhone] = useState(false);
  const [activateNow, setActivateNow] = useState(true);

  // Countdown timer effect
  useEffect(() => {
    if (!isProcessing || !success) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isProcessing, success]);

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

  const finalAmount = selectedProduct?.amount === 0 ? customAmount : (selectedProduct?.amount || amount).toString();
  const phoneError = touched.phone ? validatePhone(phone) : null;
  const amountError = touched.amount ? validateAmount(finalAmount) : null;
  const isValid = !phoneError && !amountError && phone.trim() && finalAmount.trim();

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
    setCustomAmount(numericValue);
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
    setCountdown(120);
    try {
      const formatted = formatPhoneNumber(phone);
      const numAmount = Math.round(parseFloat(finalAmount));

      const result = await initiateSTKPush({
        phoneNumber: formatted,
        amount: numAmount,
        accountReference: contributionId || `C-${Date.now()}`,
        transactionDesc: `${paymentMethod === 'lipa' ? 'LIPA NA MPESA' : 'Pay To Till'} - ${selectedProduct?.name || 'Payment'}`,
        contributionId,
      });

      if (result.ResponseCode === '0') {
        // Record pending transaction
        await supabase.from('mpesa_transactions').insert({
          transaction_type: paymentMethod === 'lipa' ? 'lipa_na_mpesa' : 'till_payment',
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

        // Generate success data
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity
        const subscriptionId = `UH${Math.floor(Math.random() * 10000000)}`;
        
        setSuccessData({
          subscriptionId,
          expiryDate: expiryDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          method: paymentMethod
        });

        setSuccess(true);
        toast({
          title: '✓ Payment Initiated',
          description: `Check your phone (${formatted}) for the ${paymentMethod === 'lipa' ? 'M-Pesa' : 'Till'} prompt within 30 seconds`,
        });
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
      setSuccessData(null);
      setErrors({});
      setTouched({});
      setPaymentMethod('lipa');
      setSelectedProduct(null);
      setCountdown(120);
      setActivateNow(true);
      setCustomAmount('');
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
        {success && successData ? (
          // Success State
          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-50 via-white to-emerald-50 min-h-96">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-in zoom-in">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Success</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4 w-full mb-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Your subscription ID is</p>
              <p className="text-xl font-bold text-gray-900 mb-1">{successData.subscriptionId}</p>
              <p className="text-xs text-gray-500">Expiry: {successData.expiryDate}</p>
            </div>

            <p className="text-sm text-gray-600 text-center mb-6">
              All your available IDs could be found by accessing{' '}
              <a href="https://portal.sasakonnect.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                https://portal.sasakonnect.net
              </a>
              {' '}-&gt; "Subscription"
            </p>

            <div className="flex gap-3 w-full">
              <Button
                onClick={() => setOpen(false)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Ok
              </Button>
            </div>

            {/* Countdown at bottom */}
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Dialog closes in {countdown}s</span>
            </div>
          </div>
        ) : (
          // Form State
          <>
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-700">Pay With</span>
                  <span className="text-2xl font-bold text-orange-600">LIPA NA MPESA</span>
                </div>
                <p className="text-xs text-gray-600">Secure mobile money transfer or Till payment</p>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Payment Method Selection */}
              <div className="space-y-3">
                <p className="font-semibold text-gray-900">Payment Method</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" style={{borderColor: paymentMethod === 'lipa' ? '#e879f9' : '#e5e7eb'}}>
                    <Radio 
                      checked={paymentMethod === 'lipa'}
                      onChange={() => setPaymentMethod('lipa')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Pay With LIPA NA MPESA</p>
                      <p className="text-xs text-gray-500">Direct M-Pesa payment prompt</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <Radio 
                      checked={paymentMethod === 'till'}
                      onChange={() => setPaymentMethod('till')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Pay To Till</p>
                      <p className="text-xs text-gray-500">Till number: 178906</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-3">
                <p className="font-semibold text-gray-900">Select Product</p>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {PAYMENT_PRODUCTS.map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        if (product.amount > 0) {
                          setAmount(product.amount.toString());
                        }
                      }}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all text-left hover:bg-gray-50',
                        selectedProduct?.id === product.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{product.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{product.icon} {product.name}</p>
                          <p className="text-xs text-gray-500">{product.description}</p>
                          {product.amount > 0 && (
                            <p className="text-sm font-bold text-green-700 mt-1">KES {product.amount.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount for Custom Airtime */}
              {selectedProduct?.id === 'airtime' && (
                <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <Label htmlFor="customAmount" className="text-sm font-semibold text-gray-900">
                    <DollarSign className="w-4 h-4 inline mr-2 text-blue-600" />
                    Enter Amount (KES)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KES</span>
                    <Input
                      id="customAmount"
                      type="text"
                      value={customAmount}
                      onChange={handleAmountChange}
                      onBlur={() => setTouched(prev => ({ ...prev, amount: true }))}
                      placeholder="Enter amount"
                      className="pl-12 text-base transition-all"
                    />
                  </div>
                  {amountError && touched.amount && (
                    <p className="text-xs text-red-600">{amountError}</p>
                  )}
                </div>
              )}

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 font-semibold text-gray-900">
                  <Smartphone className="w-4 h-4 text-green-600" />
                  Enter M-PESA number
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => handleBlur('phone')}
                    placeholder="+254 - 700471113"
                    className={cn(
                      'pr-10 text-base transition-all',
                      phoneError && touched.phone
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
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
                  <p className="text-xs text-red-600">{phoneError}</p>
                )}
              </div>

              {/* Activation Timing */}
              <div className="space-y-2 bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-gray-900">Activation</p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio 
                      checked={activateNow}
                      onChange={() => setActivateNow(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">activate now</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio 
                      checked={!activateNow}
                      onChange={() => setActivateNow(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">activate later</span>
                  </label>
                </div>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Enter your PIN at the M-PESA prompt to complete the payment.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handlePay}
                  disabled={!isValid || isProcessing}
                  className={cn(
                    'flex-1 gap-2 font-semibold transition-all bg-gray-400 hover:bg-gray-500 text-white',
                    isProcessing && 'opacity-90'
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Awaiting Payment ... {countdown}
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Send Prompt
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isProcessing}
                  className="px-6 bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayWithMpesa;
