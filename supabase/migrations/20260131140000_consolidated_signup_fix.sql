-- CONSOLIDATED SIGNUP FIX - All critical database changes
-- Version: 20260131140000
-- Purpose: Fix recurring 500 errors on signup/callback

-- ============================================================================
-- PART 1: Fix column constraints
-- ============================================================================

-- Make phone field truly nullable
ALTER TABLE public.profiles
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN phone SET DEFAULT NULL;

-- Add default for full_name (fallback to 'Member' if not provided)
ALTER TABLE public.profiles
ALTER COLUMN full_name SET DEFAULT 'Member';

-- ============================================================================
-- PART 2: Make membership number generation robust
-- ============================================================================

-- Ensure sequence exists
CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq START WITH 1 INCREMENT BY 1;

-- Create robust membership number generator with fallback
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
    PERFORM setval('public.membership_number_seq', 2);
  END;
  
  yy := to_char(NOW(), 'YY');
  RETURN 'TS-' || LPAD(next_num::text, 5, '0') || '-' || yy;
EXCEPTION WHEN OTHERS THEN
  -- UUID-based fallback if all else fails
  RETURN 'TS-' || SUBSTRING(gen_random_uuid()::text, 1, 5);
END;
$$;

-- ============================================================================
-- PART 3: Fix RLS policies to allow auth trigger to create profiles
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Profiles created via trigger" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Officials can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Officials can update any profile" ON public.profiles;

-- CREATE POLICY for INSERT - allow service_role and user's own ID
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() = id
  );

-- CREATE POLICY for SELECT - allow own data, service_role, and officials
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR auth.role() = 'service_role'
    OR public.is_official(auth.uid())
  );

-- CREATE POLICY for UPDATE - allow own data, service_role, and officials
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR auth.role() = 'service_role'
    OR public.is_official(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id
    OR auth.role() = 'service_role'
    OR public.is_official(auth.uid())
  );

-- ============================================================================
-- PART 4: Rewrite handle_new_user trigger with proper error handling
-- ============================================================================

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
  -- Safely prepare full_name
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    'Member'
  );

  -- Safely prepare phone
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');

  -- Generate membership number with fallback
  BEGIN
    v_membership_number := public.generate_membership_number();
  EXCEPTION WHEN OTHERS THEN
    v_membership_number := 'TS-' || SUBSTRING(gen_random_uuid()::text, 1, 12);
  END;

  -- CREATE PROFILE - this is the main operation that must succeed
  BEGIN
    INSERT INTO public.profiles (
      id,
      full_name,
      phone,
      email,
      membership_number,
      id_number,
      location,
      occupation,
      status
    ) VALUES (
      NEW.id,
      v_full_name,
      v_phone,
      NEW.email,
      v_membership_number,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'id_number', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'location', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'occupation', '')), ''),
      'pending'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail - this is critical
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    -- Re-raise to ensure we know about failures
    RAISE;
  END;

  -- Assign default member role (non-critical, don't fail signup if this fails)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log but continue
    RAISE WARNING 'Failed to assign member role to user %: %', NEW.id, SQLERRM;
  END;

  -- CREATE contribution tracking (non-critical)
  BEGIN
    INSERT INTO public.contribution_tracking (member_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Log but continue
    RAISE WARNING 'Failed to create contribution tracking for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_membership_number() TO service_role, authenticated;

-- ============================================================================
-- PART 5: Cleanup - Sync any orphaned auth users
-- ============================================================================

-- Create profiles for any auth users that don't have profiles yet
INSERT INTO public.profiles (id, full_name, phone, email, membership_number, status)
SELECT 
  au.id,
  COALESCE(NULLIF(TRIM(au.raw_user_meta_data ->> 'full_name'), ''), 'Member'),
  NULLIF(TRIM(COALESCE(au.raw_user_meta_data ->> 'phone', '')), ''),
  au.email,
  public.generate_membership_number(),
  'pending'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

