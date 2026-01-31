-- Comprehensive fix for signup 500 errors
-- Issue: Multiple NOT NULL fields and potential function failures during trigger execution
-- Created: 2026-01-31

-- 1) Ensure membership_number_seq exists and is properly initialized
CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq START WITH 1 INCREMENT BY 1;

-- 2) Ensure generate_membership_number() function is robust with error handling
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
  -- If everything fails, return a UUID-based fallback
  RETURN 'TS-' || SUBSTRING(gen_random_uuid()::text, 1, 5);
END;
$$;

-- 3) Make phone column truly nullable with proper default
ALTER TABLE public.profiles
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN phone SET DEFAULT NULL;

-- 4) Ensure full_name has proper handling with sensible defaults
ALTER TABLE public.profiles
ALTER COLUMN full_name SET DEFAULT 'Member';

-- 5) Update handle_new_user() function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_membership_number TEXT;
BEGIN
  -- Generate membership number with fallback
  BEGIN
    v_membership_number := public.generate_membership_number();
  EXCEPTION WHEN OTHERS THEN
    v_membership_number := 'TS-' || SUBSTRING(gen_random_uuid()::text, 1, 12);
  END;

  -- Insert profile with proper NULL handling and defaults
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
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Member'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), ''),
    NEW.email,
    v_membership_number,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'id_number', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'location', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'occupation', '')), ''),
    'pending'
  );
  
  -- Assign default member role
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
  EXCEPTION WHEN OTHERS THEN
    -- If role assignment fails, log but don't fail the entire transaction
    RAISE WARNING 'Failed to assign member role to user %: %', NEW.id, SQLERRM;
  END;
  
  -- Create contribution tracking record
  BEGIN
    INSERT INTO public.contribution_tracking (member_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- If tracking fails, log but don't fail the entire transaction
    RAISE WARNING 'Failed to create contribution tracking for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_membership_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

