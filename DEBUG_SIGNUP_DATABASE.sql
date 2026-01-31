-- Query to check email confirmation settings and signup issues
-- This helps diagnose why signups are failing with 500 errors

-- 1. Check profiles table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check if profiles RLS policies allow inserts
SELECT 
  polname, 
  polcmd, 
  polroles::text, 
  polwithcheck::text
FROM pg_policy 
WHERE polrelid = 'public.profiles'::regclass
AND polcmd = 'i';  -- INSERT policies only

-- 3. Check user_roles table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- 4. Check contribution_tracking structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'contribution_tracking'
ORDER BY ordinal_position;

-- 5. Check if the trigger exists and is correct
SELECT 
  tgname, 
  tgtype::integer,
  proname,
  tgdisabled
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'auth.users'::regclass;

-- 6. Check the handle_new_user function source
SELECT proname, prosrc 
FROM pg_proc
WHERE proname = 'handle_new_user'
AND pronamespace = 'public'::regnamespace;

