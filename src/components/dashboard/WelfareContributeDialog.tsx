import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Smartphone,
  Heart,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';
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
  const [phone, setPhone] = useState(profile?.phone || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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

  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
    if (cleaned.length > 13) return 'Phone number is too long';
    const phoneRegex = /^(254|0)?7\d{8}$/;
    if (!phoneRegex.exec(cleaned)) {
      return 'Invalid Kenyan phone number format';
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
  const isValid = !phoneError && !amountError && phone.trim() && amount.trim();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newValue = value.replace(/[^\d+\s]/g, '');
    setPhone(newValue);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setAmount(value);
  };

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
    setPaymentStep('processing');
    setStatusMessage('Initializing M-Pesa payment...');

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const numAmount = Math.round(Number.parseFloat(amount));

      // First, create a contribution record
      const { data: contributionData, error: contributionError } = await supabase
        .from('contributions')
        .insert({
          welfare_case_id: welfareCaseId,
          member_id: user.id,
          amount: numAmount,
          notes: notes || null,
          contribution_type: 'welfare',
          status: 'pending',
        })
        .select()
        .single();

      if (contributionError) throw contributionError;

      const contributionId = contributionData.id;

      // Initiate STK Push for M-Pesa payment
      const response = await initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: numAmount,
        accountReference: `WF-${welfareCaseId.slice(0, 8)}-${Date.now()}`,
        transactionDesc: `Welfare: ${welfareCaseTitle}`,
        contributionId,
      });

      if (response.ResponseCode === '0') {
        setReferenceId(contributionId);
        setStatusMessage('Please complete the M-Pesa payment on your phone...');
        
        // Poll for payment status
        let pollCount = 0;
        const maxPolls = 60; // 60 polls * 5 seconds = 5 minutes

        const pollPaymentStatus = async () => {
          try {
            const { data, error } = await supabase
              .from('contributions')
              .select('status')
              .eq('id', contributionId)
              .single();

            if (error) throw error;

            const status = (data as { status?: string | null })?.status;
            if (status === 'completed') {
              clearTimeout(pollingRef.current as ReturnType<typeof setTimeout>);
              setPaymentStep('success');
              setStatusMessage('Contribution recorded successfully!');
              toast.success('Thank you for your contribution!');
              
              setTimeout(() => {
                setOpen(false);
                onContributionSuccess?.();
                resetForm();
              }, 2000);
            } else if (status === 'failed') {
              clearTimeout(pollingRef.current as ReturnType<typeof setTimeout>);
              setStatusMessage('Payment failed. Please try again.');
              toast.error('Payment failed. Please try again.');
              setPaymentStep('form');
            } else if (pollCount < maxPolls) {
              pollCount++;
              pollingRef.current = setTimeout(pollPaymentStatus, 5000);
            } else {
              clearTimeout(pollingRef.current as ReturnType<typeof setTimeout>);
              setStatusMessage('Payment verification timed out. Please check your M-Pesa messages.');
              toast.error('Payment verification timed out');
              setPaymentStep('form');
            }
          } catch (error) {
            console.error('Error polling payment status:', error);
            clearTimeout(pollingRef.current as ReturnType<typeof setTimeout>);
          }
        };

        pollPaymentStatus();
      } else {
        throw new Error(response.ResponseDescription || 'Failed to initiate M-Pesa payment');
      }
    } catch (error) {
      console.error('Error processing contribution:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process contribution';
      toast.error(errorMessage);
      setStatusMessage(errorMessage);
      setPaymentStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setNotes('');
    setPhone(profile?.phone || '');
    setShowPhone(false);
    setTouched({});
    setPaymentStep('form');
    setReferenceId('');
    setStatusMessage('');
  };

  const handleDialogClose = () => {
    setOpen(false);
    resetForm();
  };

  const remainingAmount = targetAmount ? Math.max(0, targetAmount - collectedAmount) : null;

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
        </DialogHeader>

        {paymentStep === 'form' && (
          <div className="space-y-4">
            {/* Progress Information */}
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

            {/* Phone Number Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number *
              </Label>
              <div className="relative">
                <Input
                  id="phone"
                  type={showPhone ? 'text' : 'password'}
                  placeholder="+254712345678 or 0712345678"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => handleBlur('phone')}
                  className={cn(
                    'pr-10',
                    touched.phone && phoneError && 'border-red-500 focus:ring-red-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPhone(!showPhone)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPhone ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {phoneError && touched.phone && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {phoneError}
                </p>
              )}
            </div>

            {/* Amount Field */}
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
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={handleAmountChange}
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

            {/* Notes Field */}
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

            {/* Payment Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  You'll receive an M-Pesa prompt on your phone. Enter your M-Pesa PIN to complete the payment.
                </p>
              </div>
            </div>

            {/* Contribute Button */}
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
          </div>
        )}

        {paymentStep === 'processing' && (
          <div className="space-y-4 py-6">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-sm font-medium">{statusMessage}</p>
            <p className="text-center text-xs text-muted-foreground">
              This may take a few moments. Please wait...
            </p>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="space-y-4 py-6">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-center font-medium">{statusMessage}</p>
            <p className="text-center text-sm text-muted-foreground">
              Reference ID: {referenceId}
            </p>
            <Button
              onClick={handleDialogClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WelfareContributeDialog;
