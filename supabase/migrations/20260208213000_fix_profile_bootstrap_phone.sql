-- Ensure profile bootstrap sets a non-null phone and backfills missing profiles

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
      COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), ''), '0000000000'),
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

-- Backfill missing profiles for existing auth users
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      u.id,
      COALESCE(NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''), 'Member') AS full_name,
      COALESCE(NULLIF(TRIM(COALESCE(u.raw_user_meta_data ->> 'phone', '')), ''), '0000000000') AS phone,
      u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, full_name, phone, email, membership_number, status)
      VALUES (r.id, r.full_name, r.phone, r.email, public.generate_membership_number(), 'pending')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping profile backfill for user % due to: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Backfill notification preferences for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.notification_preferences np ON np.user_id = p.id
WHERE np.user_id IS NULL;
