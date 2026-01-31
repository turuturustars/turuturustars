-- Emergency fix: Create profiles synchronously for any unsigned-in users
-- This is a safeguard if the trigger fails
-- 
-- Issue: handle_new_user trigger seems to be failing silently
-- Solution: Use a scheduled function to cleanup orphaned auth users without profiles

CREATE OR REPLACE FUNCTION public.sync_auth_to_profiles()
RETURNS TABLE(created_count INT, error_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INT := 0;
  v_error TEXT := NULL;
  v_membership TEXT;
BEGIN
  -- Find auth users without profiles and create profiles for them
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

  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count, v_error;
  
EXCEPTION WHEN OTHERS THEN
  v_error := SQLERRM;
  RETURN QUERY SELECT 0, v_error;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_auth_to_profiles() TO service_role, authenticated;

-- Test the function
SELECT * FROM public.sync_auth_to_profiles();

