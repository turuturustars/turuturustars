-- Keep kitty notification triggers compatible with the current SMS queue schema.
-- sms_notifications_queue requires user_id/event_type/event_id, so route kitty
-- SMS through queue_sms_notification instead of inserting phone/message directly.

CREATE OR REPLACE FUNCTION public.notify_members_on_kitty_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT := COALESCE(NULLIF(btrim(NEW.title), ''), 'Community kitty');
  v_category TEXT := NEW.category::text;
  v_target TEXT := to_char(NEW.target_amount, 'FM999,999,999');
  v_msg TEXT;
  v_member RECORD;
BEGIN
  v_msg := 'Turuturu Stars: New ' || v_category || ' kitty "' ||
           v_title || '" launched. Target KES ' || v_target ||
           '. Contribute via the app.';

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p.id,
         'New community kitty: ' || v_title,
         v_msg,
         'kitty_created'
  FROM public.profiles p
  WHERE p.status = 'active';

  FOR v_member IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.status = 'active'
  LOOP
    PERFORM public.queue_sms_notification(
      v_member.id,
      'announcement',
      NEW.id,
      v_msg,
      'high'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_member_on_kitty_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kitty_title TEXT;
  v_name TEXT;
  v_first_name TEXT;
  v_amount TEXT := to_char(NEW.amount, 'FM999,999,999');
  v_msg TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_kitty_title FROM public.kitties WHERE id = NEW.kitty_id;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.member_id;

  v_first_name := COALESCE(NULLIF(split_part(COALESCE(v_name, ''), ' ', 1), ''), 'mwanachama');
  v_msg := 'Asante ' || v_first_name ||
           '! Your contribution of KES ' || v_amount ||
           ' to "' || COALESCE(v_kitty_title, 'the kitty') ||
           '" has been received. Ref: ' || COALESCE(NEW.reference, NEW.id::text) ||
           '. - Turuturu Stars';

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.member_id,
    'Thank you for your contribution',
    v_msg,
    'kitty_contribution'
  );

  PERFORM public.queue_sms_notification(
    NEW.member_id,
    'payment_success',
    NEW.id,
    v_msg,
    'high'
  );

  RETURN NEW;
END;
$$;
