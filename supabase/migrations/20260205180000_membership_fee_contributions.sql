-- Ensure membership fee contribution is created on registration and renews yearly

-- 1) Ensure next renewal date is always set
CREATE OR REPLACE FUNCTION public.set_membership_renewal_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.next_membership_renewal_date IS NULL THEN
    NEW.next_membership_renewal_date := COALESCE(NEW.joined_at, now()) + INTERVAL '1 year';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_membership_renewal_date ON public.profiles;
CREATE TRIGGER trigger_set_membership_renewal_date
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_membership_renewal_date();

-- 2) Create initial membership fee contribution when a profile is created or activated
CREATE OR REPLACE FUNCTION public.ensure_membership_fee_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.contributions
    WHERE member_id = NEW.id
      AND contribution_type = 'membership_fee'
  ) THEN
    INSERT INTO public.contributions (
      member_id,
      amount,
      contribution_type,
      status,
      due_date,
      notes
    ) VALUES (
      NEW.id,
      COALESCE(NEW.membership_fee_amount, 200),
      'membership_fee',
      'pending',
      COALESCE(NEW.joined_at, now())::date,
      'Initial membership fee'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_membership_fee_on_profile_insert ON public.profiles;
CREATE TRIGGER trigger_membership_fee_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_membership_fee_contribution();

DROP TRIGGER IF EXISTS trigger_membership_fee_on_profile_activated ON public.profiles;
CREATE TRIGGER trigger_membership_fee_on_profile_activated
  AFTER UPDATE OF status ON public.profiles
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.ensure_membership_fee_contribution();

-- 3) Generate annual renewal fees
CREATE OR REPLACE FUNCTION public.generate_membership_fee_renewals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH due_profiles AS (
    SELECT
      id,
      COALESCE(membership_fee_amount, 200) AS amount,
      next_membership_renewal_date::date AS due_date
    FROM public.profiles
    WHERE next_membership_renewal_date IS NOT NULL
      AND next_membership_renewal_date::date <= CURRENT_DATE
  ), inserted AS (
    INSERT INTO public.contributions (
      member_id,
      amount,
      contribution_type,
      status,
      due_date,
      notes
    )
    SELECT
      dp.id,
      dp.amount,
      'membership_fee',
      'pending',
      dp.due_date,
      'Annual membership renewal'
    FROM due_profiles dp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.contributions c
      WHERE c.member_id = dp.id
        AND c.contribution_type = 'membership_fee'
        AND c.due_date = dp.due_date
    )
    RETURNING member_id
  )
  UPDATE public.profiles p
  SET next_membership_renewal_date = COALESCE(p.next_membership_renewal_date, now()) + INTERVAL '1 year'
  WHERE p.id IN (SELECT member_id FROM inserted);
END;
$$;

-- 4) Backfill missing renewal dates (non-destructive)
UPDATE public.profiles
SET next_membership_renewal_date = COALESCE(joined_at, now()) + INTERVAL '1 year'
WHERE next_membership_renewal_date IS NULL;

-- 5) Schedule daily renewal job (2:00 AM)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'membership-renewals-daily';
EXCEPTION
  WHEN undefined_table THEN
    -- cron.job not available yet
    NULL;
END;
$$;

SELECT cron.schedule(
  'membership-renewals-daily',
  '0 2 * * *',
  $$SELECT public.generate_membership_fee_renewals();$$
);
