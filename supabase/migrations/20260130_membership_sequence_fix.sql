-- Replace COUNT-based membership number generation with a sequence to avoid duplicates
-- Created: 2026-01-30

-- 1) Create sequence if not exists
CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq START WITH 1 INCREMENT BY 1;

-- 2) Ensure sequence is set to max existing membership number + 1
DO $$
DECLARE
  max_num bigint;
BEGIN
  SELECT MAX((regexp_replace(membership_number, '\D', '', 'g'))::bigint) INTO max_num FROM public.profiles WHERE membership_number IS NOT NULL;
  IF max_num IS NULL THEN
    PERFORM setval('public.membership_number_seq', 1, false);
  ELSE
    PERFORM setval('public.membership_number_seq', max_num + 1, false);
  END IF;
END;
$$;

-- 3) Replace generate_membership_number() function to use sequence
CREATE OR REPLACE FUNCTION public.generate_membership_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num bigint;
BEGIN
  next_num := nextval('public.membership_number_seq');
  RETURN 'TS-' || LPAD(next_num::text, 5, '0');
END;
$$;

-- 4) Optional: ensure existing rows without membership_number get one (non-destructive)
UPDATE public.profiles
SET membership_number = public.generate_membership_number()
WHERE membership_number IS NULL;

-- End migration
