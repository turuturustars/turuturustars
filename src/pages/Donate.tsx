import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { submitPesapalOrder, getPesapalTransactionStatus } from '@/lib/pesapal';
import { supabase } from '@/integrations/supabase/client';
import { usePageMeta } from '@/hooks/usePageMeta';

const Donate = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'pesapal' | 'manual'>('pesapal');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    amount: '',
    reference: '',
    notes: '',
  });

  usePageMeta({
    title: 'Donate - Turuturu Stars CBO',
    description: 'Support Turuturu Stars CBO with a secure donation via Pesapal.',
    keywords: ['donate', 'Turuturu Stars', 'CBO', 'Pesapal', 'support'],
  });

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!form.amount.trim() || Number.isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      return 'Enter a valid amount';
    }
    if (paymentMode === 'manual' && !form.reference.trim()) {
      return 'Transaction reference is required for manual verification';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMessage = validate();
    if (errorMessage) {
      toast({ title: 'Validation Error', description: errorMessage, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: donation, error } = await (supabase as any)
        .from('donations')
        .insert({
          donor_name: form.fullName.trim(),
          donor_email: form.email.trim(),
          donor_phone: form.phone.trim() || null,
          amount: Number(form.amount),
          currency: 'KES',
          status: 'pending',
          reference_number: paymentMode === 'manual' ? form.reference.trim() : null,
          notes: form.notes.trim() || null,
        })
        .select('id')
        .single();

      if (error || !donation) throw error ?? new Error('Failed to create donation');

      if (paymentMode === 'manual') {
        toast({
          title: 'Donation Submitted',
          description: 'Your reference was submitted for treasurer confirmation.',
        });
        setForm({ fullName: '', email: '', phone: '', amount: '', reference: '', notes: '' });
        return;
      }

      const callbackUrl = `${window.location.origin}/payment/pesapal/callback`;
      const result = await submitPesapalOrder({
        amount: Number(form.amount),
        currency: 'KES',
        description: 'Donation to Turuturu Stars CBO',
        callbackUrl,
        donationId: donation.id,
        billingAddress: {
          email_address: form.email.trim(),
          phone_number: form.phone.trim() || undefined,
          first_name: form.fullName.trim().split(' ')[0] || form.fullName.trim(),
          last_name: form.fullName.trim().split(' ').slice(1).join(' '),
        },
      });

      setCheckoutUrl(result.redirect_url);
      setOrderTrackingId(result.order_tracking_id);
      toast({
        title: 'Pesapal Checkout Ready',
        description: 'Complete your donation in the secure checkout below.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Donation failed. Try again.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!orderTrackingId) return;
    try {
      const data = await getPesapalTransactionStatus(orderTrackingId);
      const description = (data?.payment_status_description || '').toLowerCase();
      if (description.includes('completed')) {
        toast({
          title: 'Donation Confirmed',
          description: 'Thank you for your support.',
        });
        setCheckoutUrl(null);
        setOrderTrackingId(null);
        setForm({ fullName: '', email: '', phone: '', amount: '', reference: '', notes: '' });
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
    if (!orderTrackingId || !checkoutUrl) return;
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
  }, [orderTrackingId, checkoutUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Support Turuturu Stars
          </h1>
          <p className="text-muted-foreground">
            Your donation helps fund welfare, education, and community development programs.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Make a Donation</CardTitle>
            <CardDescription>
              Pay securely with Pesapal. International donors are welcome.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="07XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES)</Label>
                  <Input
                    id="amount"
                    value={form.amount}
                    onChange={(e) => updateField('amount', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as 'pesapal' | 'manual')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pesapal">Pay now with Pesapal</SelectItem>
                    <SelectItem value="manual">I already paid (manual reference)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMode === 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="reference">Transaction Reference</Label>
                  <Input
                    id="reference"
                    value={form.reference}
                    onChange={(e) => updateField('reference', e.target.value)}
                    placeholder="Enter transaction code"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Add any additional details"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : paymentMode === 'manual' ? 'Submit Reference' : 'Continue to Pesapal'}
              </Button>
            </form>

            {checkoutUrl && (
              <div className="mt-6 space-y-3">
                <div className="text-sm text-muted-foreground">
                  Complete your donation in the Pesapal checkout below.
                </div>
                <div className="w-full rounded-lg overflow-hidden border border-border bg-muted/10">
                  <iframe
                    title="Pesapal Donation Checkout"
                    src={checkoutUrl}
                    className="w-full h-[560px] bg-white"
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
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Donate;
