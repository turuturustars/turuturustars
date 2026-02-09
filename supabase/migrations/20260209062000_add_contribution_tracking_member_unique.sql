-- Ensure contribution_tracking has a unique constraint on member_id so signup bootstrap insert can use ON CONFLICT

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'contribution_tracking_member_id_key'
  ) THEN
    CREATE UNIQUE INDEX contribution_tracking_member_id_key
      ON public.contribution_tracking(member_id);
  END IF;
END;
$$;

-- Recreate handle_new_user() to keep ON CONFLICT (member_id) valid
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, membership_number, status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Member'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'phone'), ''), '0000000000'),
    NEW.email,
    public.generate_membership_number(),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.contribution_tracking (member_id)
  VALUES (NEW.id)
  ON CONFLICT (member_id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
