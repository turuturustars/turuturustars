-- Fix profiles INSERT policy to allow service_role inserts from auth trigger
-- This migration updates the RLS policy so the auth trigger (executed with the
-- Supabase service role) can create profile rows when new users are created.

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Profiles created via trigger" ON public.profiles;

-- Recreate policy allowing inserts when auth.uid() equals id OR when the
-- request is made by the service role (used internally by Supabase during
-- auth.user creation).
CREATE POLICY "Profiles created via trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR auth.role() = 'service_role'
  );

-- Note: after applying this migration, the trigger that inserts into
-- public.profiles on auth.user creation will be allowed by RLS.
