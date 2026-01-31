-- Fix RLS policy that blocks profile creation from auth trigger
-- The service_role INSERT policy may be too restrictive

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Profiles created via trigger" ON public.profiles;

-- Create a proper INSERT policy that allows:
-- 1. Users to create their own profile (auth.uid() = id)
-- 2. Service role (used by auth trigger) to create profiles
-- 3. Admins to create profiles for others
CREATE POLICY "Allow profile creation via auth trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- Allow service role (internal Supabase operations)
    auth.role() = 'service_role'
    -- Allow users to create their own profile
    OR auth.uid() = id
  );

-- Also ensure SELECT works for basic operations
CREATE POLICY "Allow profile select by own user"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR auth.role() = 'service_role'
    OR public.is_official(auth.uid())
  );

