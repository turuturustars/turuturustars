-- Add user name and email to user_roles for easier admin display
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Backfill from profiles where available
UPDATE public.user_roles ur
SET
  user_name = COALESCE(ur.user_name, p.full_name),
  user_email = COALESCE(ur.user_email, p.email)
FROM public.profiles p
WHERE p.id = ur.user_id
  AND (ur.user_name IS NULL OR ur.user_email IS NULL);

