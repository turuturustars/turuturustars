-- Add beneficiary transparency fields to kitties
ALTER TABLE public.kitties
  ADD COLUMN IF NOT EXISTS beneficiary_name TEXT,
  ADD COLUMN IF NOT EXISTS beneficiary_phone TEXT,
  ADD COLUMN IF NOT EXISTS beneficiary_relationship TEXT,
  ADD COLUMN IF NOT EXISTS beneficiary_details TEXT,
  ADD COLUMN IF NOT EXISTS beneficiary_member_id UUID;

CREATE INDEX IF NOT EXISTS idx_kitties_beneficiary_member ON public.kitties(beneficiary_member_id);
