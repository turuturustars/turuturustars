-- Notification preferences per user
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT true,
  push BOOLEAN NOT NULL DEFAULT true,
  sound BOOLEAN NOT NULL DEFAULT true,
  enable_announcements BOOLEAN NOT NULL DEFAULT true,
  enable_contributions BOOLEAN NOT NULL DEFAULT true,
  enable_welfare BOOLEAN NOT NULL DEFAULT true,
  enable_meetings BOOLEAN NOT NULL DEFAULT true,
  enable_approvals BOOLEAN NOT NULL DEFAULT true,
  enable_messages BOOLEAN NOT NULL DEFAULT true,
  enable_transactions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their notification preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their notification preferences"
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their notification preferences"
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Transaction notifications for M-Pesa lifecycle
CREATE OR REPLACE FUNCTION public.notify_mpesa_transaction()
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
      v_message := 'Your M-Pesa payment is being processed.';

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
        v_message := 'Your M-Pesa payment was completed successfully.';
      ELSIF NEW.status = 'failed' THEN
        v_title := 'Payment Failed';
        v_message := 'Your M-Pesa payment failed. Please try again.';
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

DROP TRIGGER IF EXISTS notify_mpesa_transaction_insert ON public.mpesa_transactions;
CREATE TRIGGER notify_mpesa_transaction_insert
  AFTER INSERT ON public.mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_mpesa_transaction();

DROP TRIGGER IF EXISTS notify_mpesa_transaction_update ON public.mpesa_transactions;
CREATE TRIGGER notify_mpesa_transaction_update
  AFTER UPDATE ON public.mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_mpesa_transaction();
