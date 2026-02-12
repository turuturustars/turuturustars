-- Reuse vacant membership numbers after permanent member deletion.
-- Format stays TS-00001, TS-00002, ...

CREATE OR REPLACE FUNCTION public.generate_membership_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num BIGINT;
BEGIN
  -- Serialize allocations to avoid duplicate numbers during concurrent signups.
  PERFORM pg_advisory_xact_lock(620261201);

  WITH existing AS (
    SELECT DISTINCT ((regexp_match(membership_number, '^TS-(\d+)'))[1])::BIGINT AS num
    FROM public.profiles
    WHERE membership_number ~ '^TS-\d+'
  ),
  candidate AS (
    SELECT gs.num
    FROM generate_series(
      1,
      COALESCE((SELECT MAX(num) FROM existing), 0) + 1
    ) AS gs(num)
    LEFT JOIN existing e ON e.num = gs.num
    WHERE e.num IS NULL
    ORDER BY gs.num
    LIMIT 1
  )
  SELECT num INTO next_num
  FROM candidate;

  IF next_num IS NULL OR next_num < 1 THEN
    next_num := 1;
  END IF;

  RETURN 'TS-' || LPAD(next_num::TEXT, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_membership_number() TO service_role, authenticated;
