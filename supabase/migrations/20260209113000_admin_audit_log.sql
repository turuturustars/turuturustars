-- Admin audit log + helper to check roles

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = ANY (_roles)
  );
$$;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_role public.app_role,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- View policy: elevated roles only
DROP POLICY IF EXISTS admin_audit_log_select ON public.admin_audit_log;
CREATE POLICY admin_audit_log_select
  ON public.admin_audit_log
  FOR SELECT
  USING ( public.has_any_role(auth.uid(), ARRAY['admin','chairperson','vice_chairperson','treasurer','secretary','coordinator','patron']) );

-- Insert policy: allow service role or elevated roles (for edge functions with user JWT)
DROP POLICY IF EXISTS admin_audit_log_insert ON public.admin_audit_log;
CREATE POLICY admin_audit_log_insert
  ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.has_any_role(auth.uid(), ARRAY['admin','chairperson','vice_chairperson','treasurer','secretary','coordinator','patron'])
  );

-- Prevent updates/deletes by default
DROP POLICY IF EXISTS admin_audit_log_update ON public.admin_audit_log;
DROP POLICY IF EXISTS admin_audit_log_delete ON public.admin_audit_log;

