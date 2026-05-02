-- Create a view + RPC that returns membership fee payment history joined with profiles.
-- Read access is enforced through the underlying tables' RLS (officials only see all rows).
CREATE OR REPLACE VIEW public.membership_fee_history_v AS
SELECT
  c.id,
  c.member_id,
  c.amount,
  c.status::text AS status,
  c.reference_number,
  c.due_date,
  c.paid_at,
  c.created_at,
  c.notes,
  p.full_name AS member_name,
  p.membership_number,
  p.phone AS member_phone
FROM public.contributions c
LEFT JOIN public.profiles p ON p.id = c.member_id
WHERE c.contribution_type = 'membership_fee';

-- RPC supporting filters + cursor-based pagination (created_at, id) keyset.
CREATE OR REPLACE FUNCTION public.get_membership_fee_history(
  _search text DEFAULT NULL,
  _status text DEFAULT NULL,
  _from_date timestamptz DEFAULT NULL,
  _to_date timestamptz DEFAULT NULL,
  _cursor_created_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit int DEFAULT 50
)
RETURNS SETOF public.membership_fee_history_v
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_lim int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
  v_search text := NULLIF(LOWER(TRIM(COALESCE(_search, ''))), '');
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    has_role(v_caller, 'admin'::app_role) OR
    has_role(v_caller, 'treasurer'::app_role) OR
    has_role(v_caller, 'chairperson'::app_role) OR
    has_role(v_caller, 'secretary'::app_role)
  ) THEN
    RAISE EXCEPTION 'Only officials can view membership fee history';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.membership_fee_history_v v
    WHERE (_status IS NULL OR _status = 'all' OR v.status = _status)
      AND (_from_date IS NULL OR v.created_at >= _from_date)
      AND (_to_date   IS NULL OR v.created_at <  _to_date)
      AND (
        v_search IS NULL OR
        LOWER(COALESCE(v.member_name, '')) LIKE '%' || v_search || '%' OR
        LOWER(COALESCE(v.membership_number, '')) LIKE '%' || v_search || '%' OR
        LOWER(COALESCE(v.member_phone, '')) LIKE '%' || v_search || '%' OR
        LOWER(COALESCE(v.reference_number, '')) LIKE '%' || v_search || '%'
      )
      AND (
        _cursor_created_at IS NULL OR
        (v.created_at, v.id) < (_cursor_created_at, COALESCE(_cursor_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
    ORDER BY v.created_at DESC NULLS LAST, v.id DESC
    LIMIT v_lim;
END;
$$;

REVOKE ALL ON FUNCTION public.get_membership_fee_history(text, text, timestamptz, timestamptz, timestamptz, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_membership_fee_history(text, text, timestamptz, timestamptz, timestamptz, uuid, int) TO authenticated;