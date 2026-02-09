-- Soft-delete support for members

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS soft_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

