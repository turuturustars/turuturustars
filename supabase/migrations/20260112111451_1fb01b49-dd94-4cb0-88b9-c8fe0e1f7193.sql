-- Audit log table for financial transactions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  performed_by UUID NOT NULL,
  performed_by_name TEXT,
  performed_by_role TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- M-Pesa transactions table
CREATE TABLE public.mpesa_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_type TEXT NOT NULL,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  result_code INTEGER,
  result_desc TEXT,
  amount DECIMAL(10,2) NOT NULL,
  mpesa_receipt_number TEXT,
  phone_number TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE,
  member_id UUID REFERENCES public.profiles(id),
  contribution_id UUID REFERENCES public.contributions(id),
  status TEXT DEFAULT 'pending',
  qr_code_data TEXT,
  initiated_by UUID NOT NULL,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Standing orders table
CREATE TABLE public.mpesa_standing_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.profiles(id),
  phone_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_debit_date DATE,
  status TEXT DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents table for secretary
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting minutes table for secretary
CREATE TABLE public.meeting_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL,
  attendees TEXT[],
  agenda TEXT,
  minutes_content TEXT,
  action_items JSONB DEFAULT '[]',
  document_id UUID REFERENCES public.documents(id),
  recorded_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_standing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Audit logs policies (only admin, treasurer, chairperson can view)
CREATE POLICY "Financial officials can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'treasurer') OR 
  public.has_role(auth.uid(), 'chairperson')
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- M-Pesa transactions policies
CREATE POLICY "Financial officials can view mpesa transactions"
ON public.mpesa_transactions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'treasurer') OR 
  public.has_role(auth.uid(), 'chairperson') OR
  member_id = auth.uid()
);

CREATE POLICY "Financial officials can manage mpesa transactions"
ON public.mpesa_transactions FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'treasurer') OR 
  public.has_role(auth.uid(), 'chairperson')
);

-- Standing orders policies
CREATE POLICY "Financial officials can manage standing orders"
ON public.mpesa_standing_orders FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'treasurer') OR 
  public.has_role(auth.uid(), 'chairperson')
);

CREATE POLICY "Members can view their standing orders"
ON public.mpesa_standing_orders FOR SELECT
TO authenticated
USING (member_id = auth.uid());

-- Documents policies
CREATE POLICY "Officials can manage documents"
ON public.documents FOR ALL
TO authenticated
USING (
  public.is_official(auth.uid())
);

CREATE POLICY "Members can view public documents"
ON public.documents FOR SELECT
TO authenticated
USING (is_public = true);

-- Meeting minutes policies
CREATE POLICY "Secretary can manage meeting minutes"
ON public.meeting_minutes FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'secretary') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'chairperson')
);

CREATE POLICY "Members can view approved minutes"
ON public.meeting_minutes FOR SELECT
TO authenticated
USING (status = 'approved');

-- Function to log audit actions
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_action_type TEXT,
  p_action_description TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_role TEXT;
  v_audit_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  SELECT role::TEXT INTO v_user_role FROM public.user_roles WHERE user_id = v_user_id LIMIT 1;
  
  INSERT INTO public.audit_logs (
    action_type,
    action_description,
    entity_type,
    entity_id,
    performed_by,
    performed_by_name,
    performed_by_role,
    metadata
  ) VALUES (
    p_action_type,
    p_action_description,
    p_entity_type,
    p_entity_id,
    v_user_id,
    v_user_name,
    v_user_role,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_mpesa_transactions_updated_at
  BEFORE UPDATE ON public.mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_mpesa_standing_orders_updated_at
  BEFORE UPDATE ON public.mpesa_standing_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_meeting_minutes_updated_at
  BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();