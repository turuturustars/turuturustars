-- Update membership fee notifications to link to membership fee page
CREATE OR REPLACE FUNCTION public.notify_contribution_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg text;
  title text;
  url text := '/dashboard/finance/contributions';
  notif_type text := 'contribution';
BEGIN
  IF NEW.contribution_type = 'membership_fee' THEN
    notif_type := 'transaction';
    url := '/dashboard/finance/membership-fees';

    IF TG_OP = 'INSERT' THEN
      title := 'Membership Fee Due';
      msg := 'Your annual membership fee of KES ' || NEW.amount || ' is due.';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'paid' THEN
          title := 'Membership Fee Paid';
          msg := 'Your membership fee payment has been received.';
        ELSE
          title := 'Membership Fee Updated';
          msg := 'Your membership fee is now marked as ' || NEW.status || '.';
        END IF;
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      title := 'Contribution Recorded';
      msg := 'Your contribution of KES ' || NEW.amount || ' has been recorded.';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        title := 'Contribution Status Updated';
        msg := 'Your contribution is now marked as ' || NEW.status || '.';
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    read,
    action_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.member_id,
    title,
    msg,
    notif_type,
    false,
    url,
    now(),
    now()
  );

  RETURN NEW;
END;
$$;
