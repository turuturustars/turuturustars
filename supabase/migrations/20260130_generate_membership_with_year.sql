-- Generate membership numbers in format TS-#####-YY (e.g. TS-00001-26)
-- Created: 2026-01-30

-- Ensure sequence exists
CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq START WITH 1 INCREMENT BY 1;

-- Replace generator to include two-digit year suffix
CREATE OR REPLACE FUNCTION public.generate_membership_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num bigint;
  yy TEXT;
BEGIN
  next_num := nextval('public.membership_number_seq');
  yy := to_char(NOW(), 'YY');
  RETURN 'TS-' || LPAD(next_num::text, 5, '0') || '-' || yy;
END;
$$;

-- Backfill any NULL membership_number rows (non-destructive)
UPDATE public.profiles
SET membership_number = public.generate_membership_number()
WHERE membership_number IS NULL;

-- End migration
