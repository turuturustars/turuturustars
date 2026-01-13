-- Fix security: Restrict members table access to officials only
DROP POLICY IF EXISTS "Members can view registrations" ON public.members;
CREATE POLICY "Officials can view member registrations" 
ON public.members 
FOR SELECT 
USING (is_official(auth.uid()));

-- Fix security: Restrict welfare cases to officials and beneficiaries
DROP POLICY IF EXISTS "All authenticated users can view welfare cases" ON public.welfare_cases;
CREATE POLICY "Officials and beneficiaries can view welfare cases" 
ON public.welfare_cases 
FOR SELECT 
USING (
  is_official(auth.uid()) 
  OR beneficiary_id = auth.uid()
);