-- Ensure profiles are created for every auth user (registration-safe)

-- 1) Policies (id must equal auth.uid)
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id);

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() = id OR public.is_official(auth.uid()));

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy
  ON public.profiles
  FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() = id OR public.is_official(auth.uid()))
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id OR public.is_official(auth.uid()));

DROP POLICY IF EXISTS notification_prefs_insert_policy ON public.notification_preferences;
CREATE POLICY notification_prefs_insert_policy
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_prefs_select_policy ON public.notification_preferences;
CREATE POLICY notification_prefs_select_policy
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_prefs_update_policy ON public.notification_preferences;
CREATE POLICY notification_prefs_update_policy
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Trigger to always create a baseline profile + prefs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile (minimal required fields)
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

  -- Create notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill missing profiles + prefs for existing users
INSERT INTO public.profiles (id, full_name, phone, email, membership_number, status)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''), 'Member') AS full_name,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data ->> 'phone'), ''), '0000000000') AS phone,
  u.email,
  public.generate_membership_number(),
  'pending'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.notification_preferences (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.notification_preferences np ON np.user_id = p.id
WHERE np.user_id IS NULL;
