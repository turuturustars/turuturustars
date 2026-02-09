-- Reinstate full signup bootstrap: user_roles + contribution_tracking alongside profiles & notification_preferences
-- Also backfill missing rows for existing users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profile (minimal required fields)
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

  -- Default member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Contribution tracking
  INSERT INTO public.contribution_tracking (member_id)
  VALUES (NEW.id)
  ON CONFLICT (member_id) DO NOTHING;

  -- Notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill any missing rows for existing users/profiles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'member'
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'member'
WHERE ur.user_id IS NULL;

INSERT INTO public.contribution_tracking (member_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.contribution_tracking ct ON ct.member_id = p.id
WHERE ct.member_id IS NULL;
