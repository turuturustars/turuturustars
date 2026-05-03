-- 1) SMS outbound queue (consumed by the sms-reminders edge function)
CREATE TABLE IF NOT EXISTS public.sms_notifications_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  provider_message_id TEXT,
  provider_response JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_queue_status_created
  ON public.sms_notifications_queue(status, created_at);

ALTER TABLE public.sms_notifications_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officials can view sms queue" ON public.sms_notifications_queue;
CREATE POLICY "Officials can view sms queue"
  ON public.sms_notifications_queue FOR SELECT
  USING (is_official(auth.uid()));

-- Helper: normalize a phone number to +2547XXXXXXXX / +2541XXXXXXXX. Returns NULL if invalid.
CREATE OR REPLACE FUNCTION public.normalize_ke_phone(_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v TEXT;
BEGIN
  IF _raw IS NULL THEN RETURN NULL; END IF;
  v := regexp_replace(_raw, '[^0-9+]', '', 'g');
  v := regexp_replace(v, '^\+', '', 'g');
  IF v ~ '^0[17][0-9]{8}$' THEN
    v := '254' || substr(v, 2);
  ELSIF v ~ '^[17][0-9]{8}$' THEN
    v := '254' || v;
  END IF;
  IF v ~ '^254[17][0-9]{8}$' THEN
    RETURN '+' || v;
  END IF;
  RETURN NULL;
END;
$$;

-- 2) Trigger: notify all active members when a new kitty is created
CREATE OR REPLACE FUNCTION public.notify_members_on_kitty_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT := NEW.title;
  v_category TEXT := NEW.category::text;
  v_target TEXT := to_char(NEW.target_amount, 'FM999,999,999');
  v_msg TEXT;
BEGIN
  v_msg := 'Turuturu Stars: New ' || v_category || ' kitty "' ||
           v_title || '" launched. Target KES ' || v_target ||
           '. Contribute via the app.';

  -- In-app notifications for every active member
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p.id,
         'New community kitty: ' || v_title,
         v_msg,
         'kitty_created'
  FROM public.profiles p
  WHERE p.status = 'active';

  -- Queue SMS for active members with a valid phone number
  INSERT INTO public.sms_notifications_queue (phone, message)
  SELECT public.normalize_ke_phone(p.phone), v_msg
  FROM public.profiles p
  WHERE p.status = 'active'
    AND public.normalize_ke_phone(p.phone) IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kitty_created_notify ON public.kitties;
CREATE TRIGGER trg_kitty_created_notify
AFTER INSERT ON public.kitties
FOR EACH ROW EXECUTE FUNCTION public.notify_members_on_kitty_created();

-- 3) Trigger: thank a member after a kitty contribution lands
CREATE OR REPLACE FUNCTION public.notify_member_on_kitty_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kitty_title TEXT;
  v_phone TEXT;
  v_name TEXT;
  v_amount TEXT := to_char(NEW.amount, 'FM999,999,999');
  v_msg TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_kitty_title FROM public.kitties WHERE id = NEW.kitty_id;
  SELECT full_name, public.normalize_ke_phone(phone)
    INTO v_name, v_phone
  FROM public.profiles WHERE id = NEW.member_id;

  v_msg := 'Asante ' || COALESCE(split_part(v_name, ' ', 1), 'mwanachama') ||
           '! Your contribution of KES ' || v_amount ||
           ' to "' || COALESCE(v_kitty_title, 'the kitty') ||
           '" has been received. Ref: ' || COALESCE(NEW.reference, NEW.id::text) ||
           '. — Turuturu Stars';

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.member_id,
    'Thank you for your contribution',
    v_msg,
    'kitty_contribution'
  );

  IF v_phone IS NOT NULL THEN
    INSERT INTO public.sms_notifications_queue (phone, message)
    VALUES (v_phone, v_msg);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kitty_contribution_notify ON public.kitty_contributions;
CREATE TRIGGER trg_kitty_contribution_notify
AFTER INSERT ON public.kitty_contributions
FOR EACH ROW EXECUTE FUNCTION public.notify_member_on_kitty_contribution();

-- 4) Trigger: thank a member after a wallet top-up is credited
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
  -- Only thank successful credits to the wallet (top-ups)
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
           '. — Turuturu Stars';

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    'Wallet top-up confirmed',
    v_msg,
    'wallet_topup'
  );

  IF v_phone IS NOT NULL THEN
    INSERT INTO public.sms_notifications_queue (phone, message)
    VALUES (v_phone, v_msg);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_topup_notify ON public.wallet_transactions;
CREATE TRIGGER trg_wallet_topup_notify
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_member_on_wallet_topup();