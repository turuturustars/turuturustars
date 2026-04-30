-- =========================================
-- KITTY SYSTEM
-- =========================================

-- Categories
CREATE TYPE public.kitty_category AS ENUM ('emergency', 'education', 'welfare', 'project', 'other');
CREATE TYPE public.kitty_status AS ENUM ('active', 'paused', 'completed', 'closed');
CREATE TYPE public.kitty_source AS ENUM ('mpesa', 'wallet', 'manual');

-- Kitties
CREATE TABLE public.kitties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category public.kitty_category NOT NULL DEFAULT 'other',
  target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount >= 0),
  deadline DATE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_contributed NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_disbursed NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.kitty_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kitties_status ON public.kitties(status);
CREATE INDEX idx_kitties_category ON public.kitties(category);

CREATE TRIGGER kitties_updated_at
  BEFORE UPDATE ON public.kitties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.kitties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view kitties"
  ON public.kitties FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Financial officials can insert kitties"
  ON public.kitties FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'chairperson'::app_role)
  );

CREATE POLICY "Financial officials can update kitties"
  ON public.kitties FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'chairperson'::app_role)
  );

CREATE POLICY "Admins can delete kitties"
  ON public.kitties FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Contributions ledger (immutable)
CREATE TABLE public.kitty_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitty_id UUID NOT NULL REFERENCES public.kitties(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  source public.kitty_source NOT NULL,
  reference TEXT,
  mpesa_transaction_id UUID,
  wallet_transaction_id UUID,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kitty_contrib_kitty ON public.kitty_contributions(kitty_id);
CREATE INDEX idx_kitty_contrib_member ON public.kitty_contributions(member_id);
CREATE INDEX idx_kitty_contrib_created ON public.kitty_contributions(created_at DESC);

ALTER TABLE public.kitty_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own kitty contributions"
  ON public.kitty_contributions FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

CREATE POLICY "Officials view all kitty contributions"
  ON public.kitty_contributions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'chairperson'::app_role)
  );

CREATE POLICY "Anyone authenticated can view contribution totals"
  ON public.kitty_contributions FOR SELECT TO authenticated
  USING (true);

-- Disbursements (treasurer-only)
CREATE TABLE public.kitty_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitty_id UUID NOT NULL REFERENCES public.kitties(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL,
  recipient TEXT,
  reference TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kitty_disb_kitty ON public.kitty_disbursements(kitty_id);

ALTER TABLE public.kitty_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view disbursements"
  ON public.kitty_disbursements FOR SELECT TO authenticated
  USING (true);

-- =========================================
-- ATOMIC FUNCTIONS
-- =========================================

-- Contribute from wallet (debits wallet AND credits kitty atomically)
CREATE OR REPLACE FUNCTION public.contribute_to_kitty_from_wallet(
  _kitty_id UUID,
  _amount NUMERIC,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet_tx UUID;
  v_contrib_id UUID;
  v_kitty_status public.kitty_status;
  v_new_balance NUMERIC;
  v_reference TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT status INTO v_kitty_status FROM public.kitties WHERE id = _kitty_id FOR UPDATE;
  IF v_kitty_status IS NULL THEN
    RAISE EXCEPTION 'Kitty not found';
  END IF;
  IF v_kitty_status <> 'active' THEN
    RAISE EXCEPTION 'Kitty is not accepting contributions';
  END IF;

  v_reference := 'KTY-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  -- Debit wallet via existing RPC (handles balance + locks)
  v_wallet_tx := public.process_wallet_transaction(
    _user_id := v_user,
    _type := 'kitty_contribution',
    _direction := 'debit',
    _amount := _amount,
    _description := COALESCE(_notes, 'Kitty contribution'),
    _reference := v_reference,
    _mpesa_transaction_id := NULL,
    _contribution_id := NULL,
    _welfare_case_id := NULL,
    _discipline_id := NULL
  );

  -- Credit kitty
  UPDATE public.kitties
    SET balance = balance + _amount,
        total_contributed = total_contributed + _amount,
        updated_at = now()
    WHERE id = _kitty_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.kitty_contributions(
    kitty_id, member_id, amount, source, reference,
    wallet_transaction_id, status, notes
  ) VALUES (
    _kitty_id, v_user, _amount, 'wallet', v_reference,
    v_wallet_tx, 'completed', _notes
  ) RETURNING id INTO v_contrib_id;

  RETURN jsonb_build_object(
    'contribution_id', v_contrib_id,
    'reference', v_reference,
    'new_balance', v_new_balance
  );
END;
$$;

-- Credit kitty from M-Pesa (called by edge function, security definer)
CREATE OR REPLACE FUNCTION public.credit_kitty_from_mpesa(
  _kitty_id UUID,
  _member_id UUID,
  _amount NUMERIC,
  _mpesa_transaction_id UUID,
  _reference TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrib_id UUID;
  v_kitty_status public.kitty_status;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT status INTO v_kitty_status FROM public.kitties WHERE id = _kitty_id FOR UPDATE;
  IF v_kitty_status IS NULL THEN
    RAISE EXCEPTION 'Kitty not found';
  END IF;

  -- Idempotency: skip if this mpesa tx already recorded
  SELECT id INTO v_contrib_id
    FROM public.kitty_contributions
    WHERE mpesa_transaction_id = _mpesa_transaction_id
    LIMIT 1;
  IF v_contrib_id IS NOT NULL THEN
    RETURN v_contrib_id;
  END IF;

  UPDATE public.kitties
    SET balance = balance + _amount,
        total_contributed = total_contributed + _amount,
        updated_at = now()
    WHERE id = _kitty_id;

  INSERT INTO public.kitty_contributions(
    kitty_id, member_id, amount, source, reference,
    mpesa_transaction_id, status
  ) VALUES (
    _kitty_id, _member_id, _amount, 'mpesa', _reference,
    _mpesa_transaction_id, 'completed'
  ) RETURNING id INTO v_contrib_id;

  RETURN v_contrib_id;
END;
$$;

-- Disbursement (treasurer/admin only)
CREATE OR REPLACE FUNCTION public.record_kitty_disbursement(
  _kitty_id UUID,
  _amount NUMERIC,
  _purpose TEXT,
  _recipient TEXT DEFAULT NULL,
  _reference TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_disb_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (has_role(v_user, 'admin'::app_role) OR has_role(v_user, 'treasurer'::app_role)) THEN
    RAISE EXCEPTION 'Only treasurer or admin can record disbursements';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF _purpose IS NULL OR length(trim(_purpose)) = 0 THEN
    RAISE EXCEPTION 'Purpose is required';
  END IF;

  SELECT balance INTO v_balance FROM public.kitties WHERE id = _kitty_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Kitty not found';
  END IF;
  IF v_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient kitty balance (have %, need %)', v_balance, _amount;
  END IF;

  UPDATE public.kitties
    SET balance = balance - _amount,
        total_disbursed = total_disbursed + _amount,
        updated_at = now()
    WHERE id = _kitty_id;

  INSERT INTO public.kitty_disbursements(
    kitty_id, amount, purpose, recipient, reference, recorded_by
  ) VALUES (
    _kitty_id, _amount, _purpose, _recipient, _reference, v_user
  ) RETURNING id INTO v_disb_id;

  RETURN v_disb_id;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitty_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitty_disbursements;