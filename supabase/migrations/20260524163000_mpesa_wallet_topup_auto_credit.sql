-- Automatically credit member wallets when an M-Pesa wallet top-up is confirmed.
-- This is the database safety net for both app and WhatsApp initiated payments.

CREATE OR REPLACE FUNCTION public.credit_wallet_from_completed_mpesa_topup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_reference TEXT;
BEGIN
  IF NEW.transaction_type IS DISTINCT FROM 'wallet_topup'
     OR NEW.status IS DISTINCT FROM 'completed'
     OR NEW.member_id IS NULL
     OR NEW.amount IS NULL
     OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE mpesa_transaction_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wallets (user_id)
  VALUES (NEW.member_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, balance
    INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = NEW.member_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Unable to create wallet for member %', NEW.member_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE mpesa_transaction_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  v_reference := COALESCE(NULLIF(NEW.mpesa_receipt_number, ''), NULLIF(NEW.checkout_request_id, ''), NEW.id::TEXT);
  v_new_balance := COALESCE(v_balance, 0) + NEW.amount;

  UPDATE public.wallets
    SET balance = v_new_balance,
        updated_at = now()
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
    NEW.member_id,
    'topup',
    'credit',
    NEW.amount,
    v_new_balance,
    'completed',
    v_reference,
    'M-Pesa wallet top-up',
    NEW.id,
    NULL
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_wallet_from_completed_mpesa_topup ON public.mpesa_transactions;
CREATE TRIGGER trg_credit_wallet_from_completed_mpesa_topup
AFTER INSERT OR UPDATE ON public.mpesa_transactions
FOR EACH ROW
WHEN (NEW.transaction_type = 'wallet_topup' AND NEW.status = 'completed')
EXECUTE FUNCTION public.credit_wallet_from_completed_mpesa_topup();

-- Backfill any confirmed top-ups that were left without a wallet ledger row.
UPDATE public.mpesa_transactions
SET updated_at = now()
WHERE transaction_type = 'wallet_topup'
  AND status = 'completed'
  AND member_id IS NOT NULL
  AND amount > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.wallet_transactions wt
    WHERE wt.mpesa_transaction_id = mpesa_transactions.id
  );
