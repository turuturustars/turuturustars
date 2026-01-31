-- ========================================================================
-- AUTHENTICATION TROUBLESHOOTING SQL COMMANDS
-- ========================================================================
-- Copy/paste these into your Supabase SQL Editor
-- Database: turuturustars
-- ========================================================================

-- ========================================================================
-- SECTION 1: DIAGNOSE CURRENT STATE
-- ========================================================================

-- Check all users and profiles
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.raw_user_meta_data,
  p.full_name,
  p.phone,
  p.id_number,
  p.status,
  p.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Check for users without profiles
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- Check for profiles without users
SELECT p.id, p.email
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL
ORDER BY p.created_at DESC;

-- ========================================================================
-- SECTION 2: CHECK TRIGGERS AND FUNCTIONS
-- ========================================================================

-- Check if trigger exists
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (trigger_name LIKE '%profile%' OR trigger_name LIKE '%user%')
ORDER BY trigger_created DESC;

-- Check if trigger function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'handle_updated_user');

-- ========================================================================
-- SECTION 3: CHECK RLS POLICIES
-- ========================================================================

-- Check all RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check if RLS is enabled on profiles
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- ========================================================================
-- SECTION 4: CREATE MISSING INFRASTRUCTURE
-- ========================================================================

-- *** OPTION 1: Create trigger for auto-creating profiles ***
-- Run this if trigger doesn't exist:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- *** OPTION 2: Create RLS policies for profiles table ***
-- Run these if policies don't exist:

-- Policy 1: Allow users to see their own profile
CREATE POLICY "Users can see their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Allow users to see all profiles (for member directory)
CREATE POLICY "All profiles visible to authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- SECTION 5: FIX DATA ISSUES
-- ========================================================================

-- Create test user for debugging
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Create profile for test user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  phone,
  id_number,
  status
)
SELECT
  id,
  email,
  'Test User',
  '+254700000000',
  '12345678',
  'active'
FROM auth.users
WHERE email = 'test@example.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  id_number = EXCLUDED.id_number,
  status = EXCLUDED.status;

-- Bulk create profiles for all users missing them
INSERT INTO public.profiles (id, email)
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT DO NOTHING;

-- Update user profile with complete information
UPDATE public.profiles
SET
  full_name = 'Your Full Name',
  phone = '+254700000000',
  id_number = '12345678',
  membership_number = 'TRS-001',
  status = 'active'
WHERE email = 'test@example.com';

-- ========================================================================
-- SECTION 6: CLEAN UP (USE WITH CAUTION!)
-- ========================================================================

-- *** WARNING: These are destructive operations ***

-- Delete a specific user (and their profile will be deleted by cascade)
-- DELETE FROM auth.users WHERE email = 'test@example.com';

-- Delete all test profiles
-- DELETE FROM public.profiles 
-- WHERE email LIKE '%test%' OR email LIKE '%example%';

-- Delete all profiles (nuclear option - only for complete reset)
-- DELETE FROM public.profiles;

-- Drop trigger (if you need to recreate it)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function (if you need to recreate it)
-- DROP FUNCTION IF EXISTS public.handle_new_user();

-- ========================================================================
-- SECTION 7: VERIFY FIXES
-- ========================================================================

-- After running fixes, verify everything works:

-- 1. Check profiles table has data
SELECT COUNT(*) as profile_count FROM public.profiles;

-- 2. Check all users have profiles
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  CASE WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.profiles)
    THEN 'OK' ELSE 'MISMATCH' END as status;

-- 3. Verify trigger is active
SELECT EXISTS(
  SELECT 1 FROM information_schema.triggers 
  WHERE trigger_name = 'on_auth_user_created'
) as trigger_exists;

-- 4. Verify RLS is enabled
SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- 5. Verify policies exist
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'profiles';

-- ========================================================================
-- SECTION 8: COMMON FIXES QUICK COMMANDS
-- ========================================================================

-- Fix: "Email already exists"
-- Reset user password:
UPDATE auth.users
SET encrypted_password = crypt('newpassword123', gen_salt('bf'))
WHERE email = 'your@email.com';

-- Fix: User stuck with incomplete profile
-- Mark profile as complete:
UPDATE public.profiles
SET 
  full_name = 'User Name',
  phone = '+254700000000',
  id_number = '12345678'
WHERE id = 'user-id-here';

-- Fix: Enable email auto-confirmation
-- Note: This must be done in Supabase Dashboard UI under:
-- Authentication → Providers → Email → Confirm email

-- ========================================================================
-- DEBUGGING QUERIES
-- ========================================================================

-- Get latest auth events
SELECT * FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 20;

-- Check for auth sessions
SELECT * FROM auth.sessions
ORDER BY created_at DESC
LIMIT 10;

-- Find duplicate emails
SELECT email, COUNT(*) as count
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for NULL values in required fields
SELECT id, email, full_name, phone, id_number
FROM public.profiles
WHERE full_name IS NULL OR phone IS NULL OR id_number IS NULL
LIMIT 20;

-- ========================================================================
-- SUCCESS CHECKS
-- ========================================================================

-- Run this to verify everything is working:
DO $$
DECLARE
  v_user_count INTEGER;
  v_profile_count INTEGER;
  v_trigger_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM auth.users;
  SELECT COUNT(*) INTO v_profile_count FROM public.profiles;
  SELECT EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
    INTO v_trigger_exists;
  SELECT rowsecurity INTO v_rls_enabled FROM pg_tables WHERE tablename = 'profiles';
  SELECT COUNT(*) INTO v_policy_count FROM pg_policies WHERE tablename = 'profiles';
  
  RAISE NOTICE 'AUTH HEALTH CHECK:';
  RAISE NOTICE '  Users: %', v_user_count;
  RAISE NOTICE '  Profiles: %', v_profile_count;
  RAISE NOTICE '  Trigger exists: %', v_trigger_exists;
  RAISE NOTICE '  RLS enabled: %', v_rls_enabled;
  RAISE NOTICE '  RLS policies: %', v_policy_count;
  RAISE NOTICE '  Match: %', CASE WHEN v_user_count = v_profile_count THEN 'YES' ELSE 'NO' END;
END $$;

-- ========================================================================
-- END OF SQL COMMANDS
-- ========================================================================
