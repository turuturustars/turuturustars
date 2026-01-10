-- Fix function search_path issues
CREATE OR REPLACE FUNCTION public.generate_membership_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.profiles WHERE membership_number IS NOT NULL;
  new_number := 'TS-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop the overly permissive policy and make it more specific
DROP POLICY IF EXISTS "Officials can manage welfare cases" ON public.welfare_cases;

-- Create specific policies for each operation
CREATE POLICY "Officials can insert welfare cases"
  ON public.welfare_cases FOR INSERT
  WITH CHECK (public.is_official(auth.uid()));

CREATE POLICY "Officials can update welfare cases"
  ON public.welfare_cases FOR UPDATE
  USING (public.is_official(auth.uid()));

CREATE POLICY "Officials can delete welfare cases"
  ON public.welfare_cases FOR DELETE
  USING (public.is_official(auth.uid()));