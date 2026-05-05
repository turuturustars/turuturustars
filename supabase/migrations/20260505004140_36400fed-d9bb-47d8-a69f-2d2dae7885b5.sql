
-- Rounds support on kitties
ALTER TABLE public.kitties
  ADD COLUMN IF NOT EXISTS round_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_kitty_id uuid REFERENCES public.kitties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kitties_parent ON public.kitties(parent_kitty_id);

-- Multiple beneficiaries per kitty
CREATE TABLE IF NOT EXISTS public.kitty_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitty_id uuid NOT NULL REFERENCES public.kitties(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  relationship text,
  details text,
  allocated_amount numeric NOT NULL DEFAULT 0,
  disbursed_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | partial | paid
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kitty_beneficiaries_kitty ON public.kitty_beneficiaries(kitty_id);

ALTER TABLE public.kitty_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view beneficiaries"
  ON public.kitty_beneficiaries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Financial officials can insert beneficiaries"
  ON public.kitty_beneficiaries FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'chairperson'::app_role)
  );

CREATE POLICY "Financial officials can update beneficiaries"
  ON public.kitty_beneficiaries FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'chairperson'::app_role)
  );

CREATE POLICY "Admins can delete beneficiaries"
  ON public.kitty_beneficiaries FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_kitty_beneficiaries_updated
  BEFORE UPDATE ON public.kitty_beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- View: top contributors overall
CREATE OR REPLACE VIEW public.kitty_top_contributors_v AS
SELECT
  kc.member_id,
  p.full_name,
  p.membership_number,
  p.photo_url,
  COUNT(*)::int AS contribution_count,
  SUM(kc.amount)::numeric AS total_amount
FROM public.kitty_contributions kc
LEFT JOIN public.profiles p ON p.id = kc.member_id
WHERE kc.status = 'completed'
GROUP BY kc.member_id, p.full_name, p.membership_number, p.photo_url;

-- View: top contributors per kitty
CREATE OR REPLACE VIEW public.kitty_top_contributors_per_kitty_v AS
SELECT
  kc.kitty_id,
  kc.member_id,
  p.full_name,
  p.membership_number,
  p.photo_url,
  COUNT(*)::int AS contribution_count,
  SUM(kc.amount)::numeric AS total_amount
FROM public.kitty_contributions kc
LEFT JOIN public.profiles p ON p.id = kc.member_id
WHERE kc.status = 'completed'
GROUP BY kc.kitty_id, kc.member_id, p.full_name, p.membership_number, p.photo_url;

GRANT SELECT ON public.kitty_top_contributors_v TO authenticated;
GRANT SELECT ON public.kitty_top_contributors_per_kitty_v TO authenticated;
