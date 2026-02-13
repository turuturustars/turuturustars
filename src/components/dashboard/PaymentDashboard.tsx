import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Smartphone,
  Banknote,
  Download,
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { markMembershipFeePaid } from '@/lib/membershipFee';

interface PaymentObligation {
  id: string;
  member_id: string;
  amount: number;
  due_date: string;
  payment_type: 'regular' | 'event' | 'penalty';
  status: 'pending' | 'paid';
  contribution_type?: string;
  welfare_case_id?: string;
  created_at: string;
}

interface PaymentTransaction {
  id: string;
  obligation_id: string;
  reference_id: string;
  amount: number;
  payment_method: 'mpesa' | 'bank' | 'cash';
  status: 'pending' | 'received' | 'confirmed' | 'rejected';
  phone_number?: string;
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
  proof_url?: string;
  notes?: string;
  transaction_id?: string;
  timestamp: string;
  confirmed_by?: string;
  confirmed_at?: string;
}

interface PaymentReceipt {
  receipt_number: string;
  date: string;
  member_name: string;
  member_number: string;
  amount: number;
  payment_method: string;
  reference_id: string;
  status: string;
}

const PaymentDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  // State management
  const [obligations, setObligations] = useState<PaymentObligation[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedObligation, setSelectedObligation] = useState<PaymentObligation | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'bank' | 'cash'>('mpesa');

  // Payment form state
  const [mpesaPhone, setMpesaPhone] = useState(profile?.phone || '');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<PaymentReceipt | null>(null);

  // Fetch payment obligations and history
  useEffect(() => {
    if (profile?.id) {
      fetchPaymentData();
    }
  }, [profile?.id]);

  const fetchPaymentData = async () => {
    try {
      const { data: contributions, error: contribError } = await supabase
        .from('contributions')
        .select('*')
        .eq('member_id', profile?.id)
        .order('created_at', { ascending: false });

      if (contribError) throw contribError;

      // Map contributions to obligations
      const mockObligations: PaymentObligation[] = (contributions || [])
        .filter((c) => c.status === 'pending' || c.status === 'missed')
        .map((c) => ({
          id: c.id,
          member_id: c.member_id,
          amount: c.amount,
          due_date: c.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          payment_type: c.welfare_case_id ? 'event' : 'regular',
          status: 'pending',
          contribution_type: c.contribution_type,
          welfare_case_id: c.welfare_case_id,
          created_at: c.created_at || new Date().toISOString(),
        }));

      setObligations(mockObligations);

      // Fetch transaction history
      const mockTransactions: PaymentTransaction[] = (contributions || [])
        .filter((c) => c.status === 'paid')
        .map((c) => ({
          id: c.id,
          obligation_id: c.id,
          reference_id: c.reference_number || `REF-${c.id.substring(0, 8)}`,
          amount: c.amount,
          payment_method: 'mpesa',
          status: 'confirmed',
          timestamp: c.paid_at || c.created_at || new Date().toISOString(),
          confirmed_at: c.paid_at,
        }));

      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment information',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validation functions
  const validateMpesaPhone = (phone: string): string | null => {
    if (!phone.trim()) return 'Phone number is required';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
    if (!cleaned.match(/^(254|0)?[17]\d{8}$/)) {
      return 'Invalid Kenyan phone number. Use 07XXXXXXXX or 01XXXXXXXX';
    }
    return null;
  };

  const validateBankDetails = (): string | null => {
    if (!bankName.trim()) return 'Bank name is required';
    if (!accountNumber.trim()) return 'Account number is required';
    if (!accountHolder.trim()) return 'Account holder name is required';
    if (accountNumber.length < 8) return 'Account number seems too short';
    return null;
  };

  const handlePaymentMethodChange = (method: 'mpesa' | 'bank' | 'cash') => {
    setPaymentMethod(method);
    setErrors({});
    setTouched({});
  };

  const handleInitiatePayment = async () => {
    if (!selectedObligation) return;

    // Validation
    let error: string | null = null;
    if (paymentMethod === 'mpesa') {
      error = validateMpesaPhone(mpesaPhone);
    } else if (paymentMethod === 'bank') {
      error = validateBankDetails();
    }

    if (error) {
      setErrors({ submit: error });
      toast({
        title: 'Validation Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Generate unique reference ID
      const referenceId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Update the contribution status
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ status: 'paid', paid_at: new Date().toISOString(), reference_number: referenceId })
        .eq('id', selectedObligation.id);

      if (updateError) throw updateError;
      if (selectedObligation.contribution_type === 'membership_fee') {
        await markMembershipFeePaid(selectedObligation.member_id);
      }

      // Generate receipt
      const receipt: PaymentReceipt = {
        receipt_number: `REC-${Date.now()}`,
        date: new Date().toLocaleDateString('en-KE', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        member_name: profile?.full_name || 'Member',
        member_number: profile?.membership_number || 'N/A',
        amount: selectedObligation.amount,
        payment_method: paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'bank' ? 'Bank Transfer' : 'Cash',
        reference_id: referenceId,
        status: 'Confirmed',
      };

      setLastReceipt(receipt);
      setShowReceipt(true);

      // Add to transactions
      const newTransaction: PaymentTransaction = {
        id: selectedObligation.id,
        obligation_id: selectedObligation.id,
        reference_id: referenceId,
        amount: selectedObligation.amount,
        payment_method: paymentMethod,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      };

      setTransactions((prev) => [newTransaction, ...prev]);

      // Remove from obligations
      setObligations((prev) => prev.filter((o) => o.id !== selectedObligation.id));

      toast({
        title: '✓ Payment Recorded',
        description: `${receipt.receipt_number} - KES ${selectedObligation.amount.toLocaleString()}`,
      });

      // Reset form
      setTimeout(() => {
        setShowPaymentDialog(false);
        setMpesaPhone(profile?.phone || '');
        setBankName('');
        setAccountNumber('');
        setAccountHolder('');
        setNotes('');
        setErrors({});
        setTouched({});
        setSelectedObligation(null);
      }, 2000);
    } catch (err: unknown) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
      toast({
        title: 'Payment Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReceipt = () => {
    if (!lastReceipt) return;

    const content = `
TURUTURU STARS CBO - PAYMENT RECEIPT
=====================================

Receipt Number: ${lastReceipt.receipt_number}
Date: ${lastReceipt.date}

MEMBER INFORMATION
==================
Name: ${lastReceipt.member_name}
Membership Number: ${lastReceipt.member_number}

PAYMENT DETAILS
===============
Amount: KES ${lastReceipt.amount.toLocaleString()}
Payment Method: ${lastReceipt.payment_method}
Reference ID: ${lastReceipt.reference_id}
Status: ${lastReceipt.status}

This is an automatically generated receipt.
For inquiries, contact the treasurer.
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${lastReceipt.receipt_number}.txt`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      initiated: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Loader2 },
      received: { bg: 'bg-purple-100', text: 'text-purple-800', icon: CheckCircle2 },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={cn(config.bg, config.text, 'gap-1')}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      regular: '📅 Regular Contribution',
      event: '🎯 Event-Based Contribution',
      penalty: '⚠️ Penalty / Arrears',
    };
    return labels[type] || type;
  };

  const totalDue = obligations.reduce((sum, o) => sum + o.amount, 0);
  const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
  const pendingPayments = obligations.filter((o) => o.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Due</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                KES {totalDue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{pendingPayments} pending</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                KES {totalPaid.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{transactions.length} payments</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{pendingPayments}</p>
              <p className="text-xs text-muted-foreground">obligations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Payment Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {totalDue + totalPaid > 0 ? ((totalPaid / (totalPaid + totalDue)) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">of obligations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="obligations" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="obligations" className="flex-1 sm:flex-none">Pending</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">History</TabsTrigger>
        </TabsList>

        {/* Pending Obligations Tab */}
        <TabsContent value="obligations">
          {obligations.length > 0 ? (
            <div className="grid gap-4">
              {obligations.map((obligation) => {
                const daysUntilDue = Math.ceil(
                  (new Date(obligation.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = daysUntilDue < 0;

                return (
                  <Card key={obligation.id} className={cn('hover:shadow-lg transition-shadow', {
                    'border-red-300 bg-red-50': isOverdue,
                  })}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {getPaymentTypeLabel(obligation.payment_type)}
                          </p>
                          {obligation.contribution_type && (
                            <p className="text-xs text-muted-foreground capitalize">
                              {obligation.contribution_type.replace('_', ' ')} Contribution
                            </p>
                          )}
                        </div>
                        {getStatusBadge(obligation.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
                          <p className="text-lg sm:text-xl font-bold text-foreground">
                            KES {obligation.amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                          <p className="text-sm font-medium">
                            {new Date(obligation.due_date).toLocaleDateString('en-KE')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Days</p>
                          <p className={cn('text-sm font-medium', {
                            'text-red-600': isOverdue,
                            'text-yellow-600': !isOverdue && daysUntilDue <= 3,
                            'text-green-600': !isOverdue && daysUntilDue > 3,
                          })}>
                            {isOverdue ? `${Math.abs(daysUntilDue)} overdue` : `${daysUntilDue} left`}
                          </p>
                        </div>
                        <div className="flex justify-start sm:justify-end col-span-2 sm:col-span-1">
                          <Button
                            onClick={() => {
                              setSelectedObligation(obligation);
                              setShowPaymentDialog(true);
                            }}
                            className="gap-2 w-full sm:w-auto"
                          >
                            <DollarSign className="w-4 h-4" />
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 text-center pb-12">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold">No Pending Obligations</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You are up to date with your payments!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history">
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn('p-3 rounded-lg', {
                          'bg-blue-100': transaction.payment_method === 'mpesa',
                          'bg-purple-100': transaction.payment_method === 'bank',
                          'bg-green-100': transaction.payment_method === 'cash',
                        })}>
                          {transaction.payment_method === 'mpesa' && <Smartphone className="w-5 h-5 text-blue-600" />}
                          {transaction.payment_method === 'bank' && <CreditCard className="w-5 h-5 text-purple-600" />}
                          {transaction.payment_method === 'cash' && <Banknote className="w-5 h-5 text-green-600" />}
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {transaction.payment_method === 'mpesa' ? 'M-Pesa' : transaction.payment_method === 'bank' ? 'Bank Transfer' : 'Cash'}
                          </p>
                          <p className="text-sm text-muted-foreground">{transaction.reference_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.timestamp).toLocaleDateString('en-KE')}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-lg">KES {transaction.amount.toLocaleString()}</p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 text-center pb-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">No Payment History</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your payment history will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Initiate Payment</DialogTitle>
          </DialogHeader>

          {selectedObligation && (
            <div className="space-y-6">
              {/* Obligation Summary */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-xl font-bold">KES {selectedObligation.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{getPaymentTypeLabel(selectedObligation.payment_type)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Due</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedObligation.due_date).toLocaleDateString('en-KE')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Payment Method</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['mpesa', 'bank', 'cash'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => handlePaymentMethodChange(method)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all text-center',
                        paymentMethod === method
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      )}
                    >
                      <div className="mb-2">
                        {method === 'mpesa' && <Smartphone className="w-6 h-6 mx-auto text-blue-600" />}
                        {method === 'bank' && <CreditCard className="w-6 h-6 mx-auto text-purple-600" />}
                        {method === 'cash' && <Banknote className="w-6 h-6 mx-auto text-green-600" />}
                      </div>
                      <p className="font-medium text-sm capitalize">
                        {method === 'mpesa' ? 'M-Pesa' : method === 'bank' ? 'Bank' : 'Cash'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* M-Pesa Form */}
              {paymentMethod === 'mpesa' && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                    <div className="relative">
                      <Input
                        id="mpesa-phone"
                        placeholder="+254 7xx xxx xxx or +254 1xx xxx xxx"
                        value={showPhone ? mpesaPhone : mpesaPhone.replace(/\d(?=.{4})/g, '*')}
                        onChange={(e) => setMpesaPhone(e.target.value.replace(/[^\d+\s]/g, ''))}
                        onBlur={() => {
                          setTouched((prev) => ({ ...prev, mpesaPhone: true }));
                          const error = validateMpesaPhone(mpesaPhone);
                          if (error) {
                            setErrors((prev) => ({ ...prev, mpesaPhone: error }));
                          }
                        }}
                        className={cn(errors.mpesaPhone && touched.mpesaPhone && 'border-red-500')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPhone(!showPhone)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPhone ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {errors.mpesaPhone && touched.mpesaPhone && (
                      <p className="text-sm text-red-600">{errors.mpesaPhone}</p>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-100 text-sm">
                    <p className="font-medium mb-1">How it works:</p>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                      <li>We'll send an STK push to your M-Pesa</li>
                      <li>Enter your M-Pesa PIN when prompted</li>
                      <li>Payment will be confirmed automatically</li>
                      <li>You'll receive a digital receipt</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Bank Transfer Form */}
              {paymentMethod === 'bank' && (
                <div className="space-y-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input
                      id="bank-name"
                      placeholder="e.g., KCB, Equity, Co-op"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      placeholder="Your account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-holder">Account Holder Name</Label>
                    <Input
                      id="account-holder"
                      placeholder="Name on the account"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Cash Form */}
              {paymentMethod === 'cash' && (
                <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="bg-white p-3 rounded border border-green-100 text-sm">
                    <p className="font-medium mb-2">Cash Payment Instructions:</p>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                      <li>Contact the treasurer to arrange pickup/delivery</li>
                      <li>Make payment in person</li>
                      <li>You'll receive a receipt immediately</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiatePayment}
                  disabled={isProcessing}
                  className="gap-2 flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Pay KES {selectedObligation.amount.toLocaleString()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Confirmation</DialogTitle>
          </DialogHeader>

          {lastReceipt && (
            <div className="space-y-4">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>

              {/* Receipt Details */}
              <div className="space-y-3 text-center">
                <p className="text-lg font-bold">Payment Successful!</p>
                <p className="text-sm text-muted-foreground">
                  Your payment has been recorded
                </p>
              </div>

              {/* Receipt Card */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 text-sm space-y-3">
                  <div className="border-b pb-2">
                    <p className="text-xs text-muted-foreground">Receipt Number</p>
                    <p className="font-mono font-bold">{lastReceipt.receipt_number}</p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{lastReceipt.date}</p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="font-bold text-lg">KES {lastReceipt.amount.toLocaleString()}</p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{lastReceipt.payment_method}</p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="text-xs text-muted-foreground">Reference ID</p>
                    <p className="font-mono text-xs">{lastReceipt.reference_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className="bg-green-100 text-green-800 mt-1">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {lastReceipt.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Download Button */}
              <Button onClick={downloadReceipt} variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentDashboard;
