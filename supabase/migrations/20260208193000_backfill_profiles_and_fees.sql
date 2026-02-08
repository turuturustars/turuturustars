-- Backfill profiles and membership fees for existing auth users

-- Create missing profiles for auth users (skip malformed rows)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      u.id,
      COALESCE(NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''), 'Member') AS full_name,
      NULLIF(TRIM(COALESCE(u.raw_user_meta_data ->> 'phone', '')), '') AS phone,
      u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, full_name, phone, email, membership_number, status)
      VALUES (r.id, r.full_name, r.phone, r.email, public.generate_membership_number(), 'pending')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping profile backfill for user % due to: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Ensure pending membership fee exists for every profile
INSERT INTO public.membership_fees (member_id, amount, fee_type, due_date, status)
SELECT p.id, 200, 'initial', CURRENT_DATE, 'pending'
FROM public.profiles p
LEFT JOIN public.membership_fees mf ON mf.member_id = p.id
WHERE mf.member_id IS NULL;

-- Ensure profiles with no membership number get one
UPDATE public.profiles
SET membership_number = public.generate_membership_number()
WHERE membership_number IS NULL;
