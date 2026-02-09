-- Add phone column and keep user name/email/phone in user_roles for admin views
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Backfill from profiles
UPDATE public.user_roles ur
SET
  user_name = COALESCE(NULLIF(ur.user_name, ''), p.full_name),
  user_email = COALESCE(NULLIF(ur.user_email, ''), p.email),
  user_phone = COALESCE(NULLIF(ur.user_phone, ''), p.phone)
FROM public.profiles p
WHERE p.id = ur.user_id
  AND (
    ur.user_name IS NULL OR ur.user_name = '' OR
    ur.user_email IS NULL OR ur.user_email = '' OR
    ur.user_phone IS NULL OR ur.user_phone = ''
  );

-- Keep user info in sync on insert/update
CREATE OR REPLACE FUNCTION public.set_user_roles_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name  TEXT;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  SELECT p.full_name, p.email, p.phone
    INTO v_name, v_email, v_phone
  FROM public.profiles p
  WHERE p.id = NEW.user_id
  LIMIT 1;

  IF COALESCE(NEW.user_name, '') = '' THEN
    NEW.user_name := v_name;
  END IF;
  IF COALESCE(NEW.user_email, '') = '' THEN
    NEW.user_email := v_email;
  END IF;
  IF COALESCE(NEW.user_phone, '') = '' THEN
    NEW.user_phone := v_phone;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_roles_contact ON public.user_roles;
CREATE TRIGGER set_user_roles_contact
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_user_roles_contact();
