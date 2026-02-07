-- Pesapal payments and donations

-- Donations table (public donors allowed)
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pesapal transaction records
CREATE TABLE IF NOT EXISTS public.pesapal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_tracking_id TEXT UNIQUE,
  merchant_reference TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  confirmation_code TEXT,
  payment_account TEXT,
  member_id UUID REFERENCES public.profiles(id),
  contribution_id UUID REFERENCES public.contributions(id),
  donation_id UUID REFERENCES public.donations(id),
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IPN event log for audit/debugging
CREATE TABLE IF NOT EXISTS public.pesapal_ipn_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_tracking_id TEXT,
  merchant_reference TEXT,
  notification_type TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesapal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesapal_ipn_events ENABLE ROW LEVEL SECURITY;

-- Donations policies
DROP POLICY IF EXISTS "Public can create donations" ON public.donations;
CREATE POLICY "Public can create donations"
  ON public.donations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Officials can view donations" ON public.donations;
CREATE POLICY "Officials can view donations"
  ON public.donations
  FOR SELECT
  USING (public.is_official(auth.uid()));

DROP POLICY IF EXISTS "Officials can update donations" ON public.donations;
CREATE POLICY "Officials can update donations"
  ON public.donations
  FOR UPDATE
  USING (public.is_official(auth.uid()))
  WITH CHECK (public.is_official(auth.uid()));

-- Pesapal transaction policies
DROP POLICY IF EXISTS "Members can view their pesapal transactions" ON public.pesapal_transactions;
CREATE POLICY "Members can view their pesapal transactions"
  ON public.pesapal_transactions
  FOR SELECT
  USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Officials can view all pesapal transactions" ON public.pesapal_transactions;
CREATE POLICY "Officials can view all pesapal transactions"
  ON public.pesapal_transactions
  FOR SELECT
  USING (public.is_official(auth.uid()));

-- IPN event policies (officials only)
DROP POLICY IF EXISTS "Officials can view pesapal ipn events" ON public.pesapal_ipn_events;
CREATE POLICY "Officials can view pesapal ipn events"
  ON public.pesapal_ipn_events
  FOR SELECT
  USING (public.is_official(auth.uid()));

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_donations_updated_at ON public.donations;
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_pesapal_transactions_updated_at ON public.pesapal_transactions;
CREATE TRIGGER update_pesapal_transactions_updated_at
  BEFORE UPDATE ON public.pesapal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
