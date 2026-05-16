-- Make wallet top-ups reliable and idempotent.
-- - Edge functions using the service role may credit confirmed M-Pesa payments.
-- - Repeated callbacks/status checks return the original wallet transaction.
-- - Completed wallet top-ups missing from the ledger are backfilled once.

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN (
    'topup',
    'dues',
    'welfare',
    'fine',
    'kitty_contribution',
    'adjustment',
    'refund',
    'reversal'
  ));

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
  v_existing_tx_id UUID;
  v_caller UUID := auth.uid();
  v_auth_role TEXT := COALESCE(NULLIF(auth.role(), ''), NULLIF(current_setting('request.jwt.claim.role', true), ''));
  v_is_system BOOLEAN := v_auth_role = 'service_role';
  v_is_official BOOLEAN;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF _direction NOT IN ('credit','debit') THEN
    RAISE EXCEPTION 'Invalid direction';
  END IF;

  IF _type NOT IN (
    'topup',
    'dues',
    'welfare',
    'fine',
    'kitty_contribution',
    'adjustment',
    'refund',
    'reversal'
  ) THEN
    RAISE EXCEPTION 'Invalid wallet transaction type: %', _type;
  END IF;

  v_is_official := (
    has_role(v_caller, 'admin'::app_role) OR
    has_role(v_caller, 'treasurer'::app_role)
  );

  IF NOT v_is_system THEN
    IF v_caller IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_caller <> _user_id AND NOT v_is_official THEN
      RAISE EXCEPTION 'Not authorized to modify this wallet';
    END IF;

    IF v_caller = _user_id AND _direction = 'credit' AND NOT v_is_official THEN
      RAISE EXCEPTION 'Members cannot directly credit their wallet';
    END IF;
  END IF;

  IF _mpesa_transaction_id IS NOT NULL THEN
    SELECT id INTO v_existing_tx_id
    FROM public.wallet_transactions
    WHERE mpesa_transaction_id = _mpesa_transaction_id
    LIMIT 1;

    IF v_existing_tx_id IS NOT NULL THEN
      RETURN v_existing_tx_id;
    END IF;
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = _user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id)
    RETURNING id, balance INTO v_wallet_id, v_balance;
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

GRANT EXECUTE ON FUNCTION public.process_wallet_transaction(UUID,TEXT,TEXT,NUMERIC,TEXT,TEXT,UUID,UUID,UUID,UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_member_on_wallet_topup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_name TEXT;
  v_amount TEXT := to_char(NEW.amount, 'FM999,999,999');
  v_balance TEXT := to_char(NEW.balance_after, 'FM999,999,999');
  v_msg TEXT;
BEGIN
  IF NEW.type <> 'topup' OR NEW.direction <> 'credit' OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT full_name, public.normalize_ke_phone(phone)
    INTO v_name, v_phone
  FROM public.profiles WHERE id = NEW.user_id;

  v_msg := 'Asante ' || COALESCE(split_part(v_name, ' ', 1), 'mwanachama') ||
           '! Your wallet top-up of KES ' || v_amount ||
           ' was successful. New balance: KES ' || v_balance ||
           '. Ref: ' || COALESCE(NEW.reference, NEW.id::text) ||
           '. - Turuturu Stars';

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    'Wallet top-up confirmed',
    v_msg,
    'wallet_topup'
  );

  IF v_phone IS NOT NULL THEN
    INSERT INTO public.sms_notifications_queue (user_id, event_type, event_id, phone, message)
    VALUES (NEW.user_id, 'payment_success', NEW.id, v_phone, v_msg)
    ON CONFLICT (user_id, event_type, event_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r RECORD;
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  FOR r IN
    SELECT
      mt.id,
      mt.member_id,
      mt.amount,
      COALESCE(mt.mpesa_receipt_number, mt.checkout_request_id, mt.id::text) AS reference
    FROM public.mpesa_transactions mt
    WHERE mt.transaction_type = 'wallet_topup'
      AND mt.status = 'completed'
      AND mt.member_id IS NOT NULL
      AND mt.amount > 0
      AND NOT EXISTS (
        SELECT 1
        FROM public.wallet_transactions wt
        WHERE wt.mpesa_transaction_id = mt.id
      )
  LOOP
    INSERT INTO public.wallets (user_id)
    VALUES (r.member_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = r.member_id
    FOR UPDATE;

    v_new_balance := v_balance + r.amount;

    UPDATE public.wallets
      SET balance = v_new_balance, updated_at = now()
      WHERE id = v_wallet_id;

    INSERT INTO public.wallet_transactions(
      wallet_id,
      user_id,
      type,
      direction,
      amount,
      balance_after,
      status,
      reference,
      description,
      mpesa_transaction_id,
      created_by
    ) VALUES (
      v_wallet_id,
      r.member_id,
      'topup',
      'credit',
      r.amount,
      v_new_balance,
      'completed',
      r.reference,
      'M-Pesa wallet top-up',
      r.id,
      NULL
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE mpesa_transaction_id IS NOT NULL
    GROUP BY mpesa_transaction_id
    HAVING count(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_mpesa_unique
      ON public.wallet_transactions(mpesa_transaction_id)
      WHERE mpesa_transaction_id IS NOT NULL';
  ELSE
    RAISE NOTICE 'Skipped unique wallet M-Pesa index because duplicate ledger rows already exist';
  END IF;
END $$;
