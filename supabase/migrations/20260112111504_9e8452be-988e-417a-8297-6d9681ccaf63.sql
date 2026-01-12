-- Fix the overly permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());

-- Fix the overly permissive mpesa_transactions policy (split into specific operations)
DROP POLICY IF EXISTS "Financial officials can manage mpesa transactions" ON public.mpesa_transactions;

CREATE POLICY "Financial officials can insert mpesa transactions"
ON public.mpesa_transactions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'treasurer') OR 
  public.has_role(auth.uid(), 'chairperson')
);

CREATE POLICY "Financial officials can update mpesa transactions"
ON public.mpesa_transactions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'treasurer') OR 
  public.has_role(auth.uid(), 'chairperson')
);

CREATE POLICY "Financial officials can delete mpesa transactions"
ON public.mpesa_transactions FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'treasurer') OR 
  public.has_role(auth.uid(), 'chairperson')
);