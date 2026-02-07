-- Notifications for Pesapal transaction lifecycle
CREATE OR REPLACE FUNCTION public.notify_pesapal_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.member_id IS NOT NULL THEN
      v_title := 'Payment Initiated';
      v_message := 'Your Pesapal payment is being processed.';

      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        read,
        action_url,
        created_at,
        updated_at
      ) VALUES (
        NEW.member_id,
        v_title,
        v_message,
        'transaction',
        false,
        '/dashboard/finance/mpesa',
        now(),
        now()
      );
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.member_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'completed' THEN
        v_title := 'Payment Successful';
        v_message := 'Your Pesapal payment was completed successfully.';
      ELSIF NEW.status = 'failed' THEN
        v_title := 'Payment Failed';
        v_message := 'Your Pesapal payment failed. Please try again.';
      ELSE
        RETURN NEW;
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
      ) VALUES (
        NEW.member_id,
        v_title,
        v_message,
        'transaction',
        false,
        '/dashboard/finance/mpesa',
        now(),
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_pesapal_transaction_insert ON public.pesapal_transactions;
CREATE TRIGGER notify_pesapal_transaction_insert
  AFTER INSERT ON public.pesapal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_pesapal_transaction();

DROP TRIGGER IF EXISTS notify_pesapal_transaction_update ON public.pesapal_transactions;
CREATE TRIGGER notify_pesapal_transaction_update
  AFTER UPDATE ON public.pesapal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_pesapal_transaction();
