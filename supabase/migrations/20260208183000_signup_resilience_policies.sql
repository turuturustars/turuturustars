-- Make signup bootstrap resilient to RLS/policy failures and allow service_role inserts

-- Broaden policies for tables touched during signup
DROP POLICY IF EXISTS user_roles_service_insert ON public.user_roles;
CREATE POLICY user_roles_service_insert
  ON public.user_roles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS contribution_tracking_service_insert ON public.contribution_tracking;
CREATE POLICY contribution_tracking_service_insert
  ON public.contribution_tracking
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS notification_prefs_service_insert ON public.notification_preferences;
CREATE POLICY notification_prefs_service_insert
  ON public.notification_preferences
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Harden handle_new_user to never fail signup if downstream inserts are blocked
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profile (critical)
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

  -- Member role (non-critical)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: user_roles insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- Contribution tracking (non-critical)
  BEGIN
    INSERT INTO public.contribution_tracking (member_id)
    VALUES (NEW.id)
    ON CONFLICT (member_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: contribution_tracking insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- Notification preferences (non-critical)
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
