-- Security hardening for Supabase lint findings
-- - Enable RLS on public tables missing it
-- - Replace overly permissive INSERT policies
-- - Ensure functions use a fixed search_path
-- - Remove SECURITY DEFINER from views (security_invoker)

-- ============================================================================
-- RLS enablement + policies for internal tables
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.realtime_change_log') IS NOT NULL THEN
    ALTER TABLE public.realtime_change_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated can view realtime change log" ON public.realtime_change_log;
    CREATE POLICY "Authenticated can view realtime change log"
      ON public.realtime_change_log
      FOR SELECT
      TO authenticated
      USING (
        client_id = (select auth.uid())::text
        OR public.is_official((select auth.uid()))
      );

    DROP POLICY IF EXISTS "Service role can manage realtime change log" ON public.realtime_change_log;
    CREATE POLICY "Service role can manage realtime change log"
      ON public.realtime_change_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.auth_trigger_errors') IS NOT NULL THEN
    ALTER TABLE public.auth_trigger_errors ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Service role can manage auth trigger errors" ON public.auth_trigger_errors;
    CREATE POLICY "Service role can manage auth trigger errors"
      ON public.auth_trigger_errors
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- ============================================================================
-- Tighten permissive public INSERT policies
-- ============================================================================

-- Donations: allow public inserts but require meaningful values
DROP POLICY IF EXISTS "Public can create donations" ON public.donations;
CREATE POLICY "Public can create donations"
  ON public.donations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    amount > 0
    AND currency IS NOT NULL
    AND length(trim(currency)) >= 3
  );

-- Members: allow public registration but require a valid-looking email/phone
DROP POLICY IF EXISTS "Anyone can register as member" ON public.members;
CREATE POLICY "Anyone can register as member"
  ON public.members
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(email)) >= 5
    AND position('@' in email) > 1
    AND length(trim(phone)) >= 7
  );

-- ============================================================================
-- Fix mutable search_path on functions
-- ============================================================================

ALTER FUNCTION public.current_user_id() SET search_path = public, extensions;
ALTER FUNCTION public.update_contributions_timestamp() SET search_path = public, extensions;
ALTER FUNCTION public.initialize_membership_fee() SET search_path = public, extensions;
ALTER FUNCTION public.set_jobs_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.set_membership_renewal_date() SET search_path = public, extensions;
ALTER FUNCTION public.update_announcements_version() SET search_path = public, extensions;
ALTER FUNCTION public.set_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.create_renewal_fee(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.log_realtime_change() SET search_path = public, extensions;
ALTER FUNCTION public.update_notifications_timestamp() SET search_path = public, extensions;

-- ============================================================================
-- Ensure views are SECURITY INVOKER (avoid SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE VIEW public.recent_changes
WITH (security_invoker = true)
AS
SELECT
  table_name,
  record_id,
  change_type,
  changed_fields,
  created_at,
  client_id
FROM public.realtime_change_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.voting_motions_with_vote_breakdown
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.title,
  m.status,
  m.created_at,
  coalesce(sum(case when v.vote = 'for' then 1 else 0 end), 0) as yes_votes,
  coalesce(sum(case when v.vote = 'against' then 1 else 0 end), 0) as no_votes,
  coalesce(count(v.id), 0) as total_votes
FROM public.voting_motions m
LEFT JOIN public.votes v ON v.motion_id = m.id
GROUP BY m.id, m.title, m.status, m.created_at;

CREATE OR REPLACE VIEW public.voting_motions_with_vote_count
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.title,
  m.status,
  m.created_at,
  coalesce(count(v.id), 0) as vote_count
FROM public.voting_motions m
LEFT JOIN public.votes v ON v.motion_id = m.id
GROUP BY m.id, m.title, m.status, m.created_at;

GRANT SELECT ON public.recent_changes TO authenticated;
GRANT SELECT ON public.voting_motions_with_vote_breakdown TO authenticated;
GRANT SELECT ON public.voting_motions_with_vote_count TO authenticated;
