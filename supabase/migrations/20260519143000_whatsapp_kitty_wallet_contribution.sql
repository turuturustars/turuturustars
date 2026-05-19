-- Allow the WhatsApp assistant to move money from a member wallet into a kitty
-- using the same wallet ledger and kitty contribution tables as the dashboard.

CREATE OR REPLACE FUNCTION public.contribute_to_kitty_from_wallet_for_member(
  _member_id UUID,
  _kitty_id UUID,
  _amount NUMERIC,
  _notes TEXT DEFAULT NULL,
  _created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_auth_role TEXT := COALESCE(NULLIF(auth.role(), ''), NULLIF(current_setting('request.jwt.claim.role', true), ''));
  v_is_system BOOLEAN := v_auth_role = 'service_role';
  v_is_official BOOLEAN;
  v_wallet_tx UUID;
  v_contrib_id UUID;
  v_kitty_status public.kitty_status;
  v_new_balance NUMERIC;
  v_reference TEXT;
BEGIN
  IF _member_id IS NULL THEN
    RAISE EXCEPTION 'Member is required';
  END IF;

  IF _kitty_id IS NULL THEN
    RAISE EXCEPTION 'Kitty is required';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  v_is_official := (
    has_role(v_caller, 'admin'::app_role) OR
    has_role(v_caller, 'treasurer'::app_role)
  );

  IF NOT v_is_system THEN
    IF v_caller IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_caller <> _member_id AND NOT v_is_official THEN
      RAISE EXCEPTION 'Not authorized to contribute from this wallet';
    END IF;
  END IF;

  SELECT status INTO v_kitty_status
  FROM public.kitties
  WHERE id = _kitty_id
  FOR UPDATE;

  IF v_kitty_status IS NULL THEN
    RAISE EXCEPTION 'Kitty not found';
  END IF;

  IF v_kitty_status <> 'active' THEN
    RAISE EXCEPTION 'Kitty is not accepting contributions';
  END IF;

  v_reference := 'KTY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  v_wallet_tx := public.process_wallet_transaction(
    _user_id := _member_id,
    _type := 'kitty_contribution',
    _direction := 'debit',
    _amount := _amount,
    _description := COALESCE(_notes, 'WhatsApp kitty contribution'),
    _reference := v_reference,
    _mpesa_transaction_id := NULL,
    _contribution_id := NULL,
    _welfare_case_id := NULL,
    _discipline_id := NULL
  );

  UPDATE public.kitties
    SET balance = balance + _amount,
        total_contributed = total_contributed + _amount,
        updated_at = now()
    WHERE id = _kitty_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.kitty_contributions(
    kitty_id,
    member_id,
    amount,
    source,
    reference,
    wallet_transaction_id,
    status,
    notes
  ) VALUES (
    _kitty_id,
    _member_id,
    _amount,
    'wallet',
    v_reference,
    v_wallet_tx,
    'completed',
    _notes
  ) RETURNING id INTO v_contrib_id;

  RETURN jsonb_build_object(
    'contribution_id', v_contrib_id,
    'wallet_transaction_id', v_wallet_tx,
    'reference', v_reference,
    'new_balance', v_new_balance,
    'created_by', _created_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.contribute_to_kitty_from_wallet_for_member(UUID, UUID, NUMERIC, TEXT, UUID)
  TO authenticated, service_role;
