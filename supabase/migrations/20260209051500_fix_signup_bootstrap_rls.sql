-- Fix RLS blocks on signup bootstrap inserts
-- Context: handle_new_user() inserts into user_roles and contribution_tracking.
-- After the 2026-02-08 policy cleanup, those tables lacked INSERT policies,
-- causing `Database error saving new user` during /auth/v1/signup.

-- Ensure RLS is on (safe if already enabled)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_tracking ENABLE ROW LEVEL SECURITY;

-- Allow service role and the authenticated user to insert their own role record
DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
CREATE POLICY user_roles_insert_policy
  ON public.user_roles FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    (select auth.role()) = 'service_role'
    OR (select auth.uid()) = user_id
  );

-- Allow service role and the authenticated user to create their contribution_tracking row
DROP POLICY IF EXISTS contribution_tracking_insert_policy ON public.contribution_tracking;
CREATE POLICY contribution_tracking_insert_policy
  ON public.contribution_tracking FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    (select auth.role()) = 'service_role'
    OR (select auth.uid()) = member_id
  );
