import { useEffect, useMemo, useState } from 'react';
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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [openHint, setOpenHint] = useState<string | null>(null);
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

  const displayName = useMemo(
    () => (isAnonymous ? 'Anonymous Supporter' : form.fullName.trim()),
    [isAnonymous, form.fullName]
  );

  const displayEmail = useMemo(() => {
    if (!isAnonymous) return form.email.trim();
    if (form.email.trim()) return form.email.trim();
    return `anonymous-${Math.random().toString(36).slice(2, 8)}@turuturustars.co.ke`;
  }, [isAnonymous, form.email]);

  const validate = () => {
    if (!displayName) return 'Full name is required';
    if (!displayEmail) return 'Email is required';
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
          donor_name: displayName,
          donor_email: displayEmail,
          donor_phone: isAnonymous ? null : form.phone.trim() || null,
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
        setIsAnonymous(false);
        setOpenHint(null);
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
          email_address: displayEmail,
          phone_number: isAnonymous ? undefined : form.phone.trim() || undefined,
          first_name: displayName.split(' ')[0] || displayName,
          last_name: displayName.split(' ').slice(1).join(' '),
        },
      });

      if (!result.redirect_url) {
        throw new Error('Checkout link was not returned. Please try again.');
      }

      setCheckoutUrl(result.redirect_url);
      setOrderTrackingId(result.order_tracking_id);
      if (result.redirect_url) {
        const newTab = window.open(result.redirect_url, '_blank', 'noopener');
        if (!newTab) {
          setOpenHint('Popup was blocked. Use “Open checkout in a new tab” below.');
        } else {
          setOpenHint(null);
        }
      }
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
        setIsAnonymous(false);
        setOpenHint(null);
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
    <div className="min-h-screen bg-gradient-to-b from-[#f5f7ff] via-white to-[#f7fbff]">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-xs tracking-wide uppercase">
            Together We Rise
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
            Fuel the Dreams of Turuturu Stars
          </h1>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            Every shilling powers welfare, education, and community breakthroughs. Give with confidence—we steward funds transparently and responsibly.
          </p>
        </div>

        <div className="grid lg:grid-cols-[2fr,1fr] gap-8 items-start">
          <Card className="shadow-xl border-primary/10">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Make a Donation</CardTitle>
              <CardDescription className="text-base">
                Pay securely. International donors welcome. Anonymous giving supported.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-primary h-4 w-4"
                  />
                  <Label htmlFor="anonymous" className="font-medium cursor-pointer">
                    Give anonymously
                  </Label>
                  <p className="text-xs text-muted-foreground ml-auto">
                    We’ll still issue a receipt email (optional).
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="Your name"
                      disabled={isAnonymous}
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
                      disabled={isAnonymous}
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
                  <Select
                    value={paymentMode}
                    onValueChange={(value) => setPaymentMode(value as 'pesapal' | 'manual')}
                  >
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
                  {isSubmitting
                    ? 'Processing...'
                    : paymentMode === 'manual'
                      ? 'Submit Reference'
                      : 'Continue to Pesapal'}
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
                    {openHint && <p className="text-[11px] text-amber-700 text-center">{openHint}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md border-primary/10 bg-gradient-to-b from-primary/5 via-white to-white">
            <CardHeader>
              <CardTitle>Where your gift goes</CardTitle>
              <CardDescription>We steward every shilling with care.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Impact highlights</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Welfare emergencies for members & families</li>
                  <li>• Skills & education bursaries for youth</li>
                  <li>• Community projects & resilience programs</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary-foreground bg-primary">
                “We promise transparent use of funds. Quarterly reports are published to all donors.”
              </div>
              <div className="p-4 rounded-xl border border-muted-foreground/20">
                <p className="text-sm font-semibold text-foreground mb-1">Thank you.</p>
                <p className="text-sm text-muted-foreground">
                  Your generosity keeps hope alive. You’ll receive a warm thank‑you message after payment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Donate;
