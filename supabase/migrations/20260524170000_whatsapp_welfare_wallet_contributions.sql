-- Let WhatsApp contribute to welfare cases from the member wallet using the
-- same wallet ledger, contribution records, welfare totals, and treasurer
-- alert triggers used elsewhere in the app.

CREATE OR REPLACE FUNCTION public.contribute_to_welfare_from_wallet_for_member(
  _member_id UUID,
  _welfare_case_id UUID,
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
  v_contribution_id UUID;
  v_welfare_status TEXT;
  v_welfare_title TEXT;
  v_new_collected NUMERIC;
  v_reference TEXT;
BEGIN
  IF _member_id IS NULL THEN
    RAISE EXCEPTION 'Member is required';
  END IF;

  IF _welfare_case_id IS NULL THEN
    RAISE EXCEPTION 'Welfare case is required';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  v_is_official := (
    has_role(v_caller, 'admin'::app_role) OR
    has_role(v_caller, 'chairperson'::app_role) OR
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

  SELECT status, title
    INTO v_welfare_status, v_welfare_title
  FROM public.welfare_cases
  WHERE id = _welfare_case_id
  FOR UPDATE;

  IF v_welfare_status IS NULL THEN
    RAISE EXCEPTION 'Welfare case not found';
  END IF;

  IF v_welfare_status <> 'active' THEN
    RAISE EXCEPTION 'Welfare case is not accepting contributions';
  END IF;

  v_reference := 'WEL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  v_wallet_tx := public.process_wallet_transaction(
    _user_id := _member_id,
    _type := 'welfare',
    _direction := 'debit',
    _amount := _amount,
    _description := COALESCE(_notes, 'WhatsApp welfare contribution'),
    _reference := v_reference,
    _mpesa_transaction_id := NULL,
    _contribution_id := NULL,
    _welfare_case_id := _welfare_case_id,
    _discipline_id := NULL
  );

  INSERT INTO public.contributions(
    member_id,
    welfare_case_id,
    amount,
    contribution_type,
    status,
    paid_at,
    reference_number,
    notes
  ) VALUES (
    _member_id,
    _welfare_case_id,
    _amount,
    'welfare',
    'paid',
    now(),
    v_reference,
    _notes
  ) RETURNING id INTO v_contribution_id;

  UPDATE public.welfare_cases
     SET collected_amount = COALESCE(collected_amount, 0) + _amount
   WHERE id = _welfare_case_id
  RETURNING collected_amount INTO v_new_collected;

  INSERT INTO public.welfare_transactions(
    welfare_case_id,
    amount,
    transaction_type,
    mpesa_code,
    recorded_by_id,
    notes,
    status
  ) VALUES (
    _welfare_case_id,
    _amount,
    'contribution',
    v_reference,
    _member_id,
    COALESCE(_notes, 'WhatsApp wallet welfare contribution'),
    'completed'
  );

  RETURN jsonb_build_object(
    'contribution_id', v_contribution_id,
    'wallet_transaction_id', v_wallet_tx,
    'welfare_case_id', _welfare_case_id,
    'welfare_title', v_welfare_title,
    'reference', v_reference,
    'new_collected_amount', v_new_collected,
    'created_by', _created_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.contribute_to_welfare_from_wallet_for_member(UUID, UUID, NUMERIC, TEXT, UUID)
  TO authenticated, service_role;
