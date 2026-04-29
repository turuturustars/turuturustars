-- =========================
-- WALLETS
-- =========================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'active', -- active | frozen
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Officials view all wallets"
  ON public.wallets FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'chairperson'::app_role)
  );

CREATE POLICY "Officials update wallets"
  ON public.wallets FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role)
  );

CREATE POLICY "Members can insert own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- WALLET TRANSACTIONS (LEDGER)
-- =========================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup','dues','welfare','fine','adjustment','refund','reversal')),
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  reference TEXT,
  description TEXT,
  mpesa_transaction_id UUID,
  contribution_id UUID,
  welfare_case_id UUID,
  discipline_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_mpesa ON public.wallet_transactions(mpesa_transaction_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Officials view all wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'chairperson'::app_role)
  );

-- No direct INSERT/UPDATE/DELETE policies on transactions:
-- writes go through SECURITY DEFINER function process_wallet_transaction

-- =========================
-- ENSURE WALLET HELPER
-- =========================
CREATE OR REPLACE FUNCTION public.ensure_wallet(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = _user_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) RETURNING id INTO v_wallet_id;
  END IF;
  RETURN v_wallet_id;
END;
$$;

-- =========================
-- AUTO-CREATE WALLET ON PROFILE CREATE
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_wallet_on_profile ON public.profiles;
CREATE TRIGGER trg_create_wallet_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_wallet();

-- Backfill wallets for existing profiles
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- =========================
-- ATOMIC TRANSACTION PROCESSOR
-- =========================
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  _user_id UUID,
  _type TEXT,
  _direction TEXT,
  _amount NUMERIC,
  _description TEXT DEFAULT NULL,
  _reference TEXT DEFAULT NULL,
  _mpesa_transaction_id UUID DEFAULT NULL,
  _contribution_id UUID DEFAULT NULL,
  _welfare_case_id UUID DEFAULT NULL,
  _discipline_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_tx_id UUID;
  v_caller UUID := auth.uid();
  v_is_official BOOLEAN;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF _direction NOT IN ('credit','debit') THEN
    RAISE EXCEPTION 'Invalid direction';
  END IF;

  v_is_official := (
    has_role(v_caller, 'admin'::app_role) OR
    has_role(v_caller, 'treasurer'::app_role)
  );

  -- Authorization rules:
  -- - Users may debit their own wallet for dues/welfare/fine
  -- - Officials may credit/debit any wallet (topup confirmations, adjustments, refunds)
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller <> _user_id AND NOT v_is_official THEN
    RAISE EXCEPTION 'Not authorized to modify this wallet';
  END IF;

  IF v_caller = _user_id AND _direction = 'credit' AND NOT v_is_official THEN
    -- Members cannot self-credit (must come via M-Pesa edge function or treasurer)
    RAISE EXCEPTION 'Members cannot directly credit their wallet';
  END IF;

  -- Lock the wallet row
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = _user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) RETURNING id, balance INTO v_wallet_id, v_balance;
  END IF;

  IF _direction = 'debit' THEN
    IF v_balance < _amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance (have %, need %)', v_balance, _amount;
    END IF;
    v_new_balance := v_balance - _amount;
  ELSE
    v_new_balance := v_balance + _amount;
  END IF;

  UPDATE public.wallets
    SET balance = v_new_balance, updated_at = now()
    WHERE id = v_wallet_id;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, direction, amount, balance_after,
    status, reference, description,
    mpesa_transaction_id, contribution_id, welfare_case_id, discipline_id,
    created_by
  ) VALUES (
    v_wallet_id, _user_id, _type, _direction, _amount, v_new_balance,
    'completed', _reference, _description,
    _mpesa_transaction_id, _contribution_id, _welfare_case_id, _discipline_id,
    v_caller
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_wallet_transaction(UUID,TEXT,TEXT,NUMERIC,TEXT,TEXT,UUID,UUID,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_wallet(UUID) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;