-- Harden signup bootstrap, profile access, and billing backfill

-- Profiles RLS policies (authoritative)
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id);

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy
  ON public.profiles FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() = id OR public.is_official(auth.uid()));

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() = id OR public.is_official(auth.uid()))
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id OR public.is_official(auth.uid()));

-- Recreate handle_new_user with robust inserts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profile
  BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, membership_number, status)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Member'),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), ''),
      NEW.email,
      public.generate_membership_number(),
      'pending'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- Default member role
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: user_roles insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- Contribution tracking
  BEGIN
    INSERT INTO public.contribution_tracking (member_id)
    VALUES (NEW.id)
    ON CONFLICT (member_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: contribution_tracking insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- Notification preferences
  BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: notification_preferences insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Backfill missing membership numbers
UPDATE public.profiles
SET membership_number = public.generate_membership_number()
WHERE membership_number IS NULL;

-- Backfill membership fees for existing profiles without any fee row
INSERT INTO public.membership_fees (member_id, amount, fee_type, due_date, status)
SELECT p.id, 200, 'initial', CURRENT_DATE, 'pending'
FROM public.profiles p
LEFT JOIN public.membership_fees mf ON mf.member_id = p.id
WHERE mf.member_id IS NULL;

-- Ensure next renewal date is set for members missing it
UPDATE public.profiles
SET next_membership_renewal_date = COALESCE(next_membership_renewal_date, joined_at + INTERVAL '1 year')
WHERE next_membership_renewal_date IS NULL;
