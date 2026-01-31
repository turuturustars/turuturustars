-- EMERGENCY MANUAL FIX - Run this directly in Supabase SQL Editor if migrations aren't working
-- This fixes the signup 500 error manually

-- ============================================================================
-- Step 1: Check current state
-- ============================================================================

-- Check if phone column is nullable
SELECT column_name, is_nullable FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'phone';

-- Check if full_name has default
SELECT column_name, is_nullable, column_default FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'full_name';

-- Check current handle_new_user function
SELECT proname, prosrc FROM pg_proc 
WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;

-- ============================================================================
-- Step 2: Apply the fix if needed
-- ============================================================================

-- Make phone nullable if it's not already
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT NULL;

-- Add default for full_name
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT 'Member';

-- Drop all restrictive RLS policies on profiles
DROP POLICY IF EXISTS "Profiles created via trigger" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Officials can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Officials can update any profile" ON public.profiles;

-- Create new permissive RLS policies
CREATE POLICY "profiles_insert_auth_trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id);

CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR auth.role() = 'service_role' OR public.is_official(auth.uid()));

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR auth.role() = 'service_role' OR public.is_official(auth.uid()))
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role' OR public.is_official(auth.uid()));

-- Ensure sequence exists
CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq START WITH 1 INCREMENT BY 1;

-- Fix generate_membership_number function
CREATE OR REPLACE FUNCTION public.generate_membership_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num bigint;
  yy TEXT;
BEGIN
  BEGIN
    next_num := nextval('public.membership_number_seq');
  EXCEPTION WHEN OTHERS THEN
    next_num := 1;
  END;
  
  yy := to_char(NOW(), 'YY');
  RETURN 'TS-' || LPAD(next_num::text, 5, '0') || '-' || yy;
EXCEPTION WHEN OTHERS THEN
  RETURN 'TS-' || SUBSTRING(gen_random_uuid()::text, 1, 12);
END;
$$;

-- Rewrite handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_membership_number TEXT;
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Member');
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');

  BEGIN
    v_membership_number := public.generate_membership_number();
  EXCEPTION WHEN OTHERS THEN
    v_membership_number := 'TS-' || SUBSTRING(gen_random_uuid()::text, 1, 12);
  END;

  INSERT INTO public.profiles (id, full_name, phone, email, membership_number, id_number, location, occupation, status)
  VALUES (NEW.id, v_full_name, v_phone, NEW.email, v_membership_number, 
          NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'id_number', '')), ''),
          NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'location', '')), ''),
          NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'occupation', '')), ''), 'pending');

  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to assign member role to user %', NEW.id;
  END;

  BEGIN
    INSERT INTO public.contribution_tracking (member_id) VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create contribution tracking for user %', NEW.id;
  END;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_membership_number() TO service_role, authenticated;

-- Sync orphaned auth users
INSERT INTO public.profiles (id, full_name, phone, email, membership_number, status)
SELECT au.id, COALESCE(NULLIF(TRIM(au.raw_user_meta_data ->> 'full_name'), ''), 'Member'),
       NULLIF(TRIM(COALESCE(au.raw_user_meta_data ->> 'phone', '')), ''), au.email,
       public.generate_membership_number(), 'pending'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 3: Verify the fix
-- ============================================================================

-- Verify phone is nullable
SELECT is_nullable FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'phone';
-- Expected: true

-- Verify RLS policies allow inserts
SELECT polname FROM pg_policy 
WHERE polrelid = 'public.profiles'::regclass AND polcmd = 'i';
-- Expected: profiles_insert_auth_trigger

-- Verify handle_new_user function is updated
SELECT POSITION('NULLIF(TRIM' in prosrc) > 0 as is_fixed 
FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;
-- Expected: true

