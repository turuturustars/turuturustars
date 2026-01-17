-- Add membership fee columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_fee_amount DECIMAL(10,2) DEFAULT 200,
ADD COLUMN IF NOT EXISTS membership_fee_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS membership_fee_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_membership_renewal_date TIMESTAMP WITH TIME ZONE;

-- Create membership_fees table for tracking payment history
CREATE TABLE IF NOT EXISTS public.membership_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 200,
  fee_type TEXT NOT NULL DEFAULT 'initial', -- initial, renewal
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_membership_fees_member_id ON public.membership_fees(member_id);
CREATE INDEX IF NOT EXISTS idx_membership_fees_status ON public.membership_fees(status);
CREATE INDEX IF NOT EXISTS idx_membership_fees_due_date ON public.membership_fees(due_date);

-- Enable RLS on membership_fees table
ALTER TABLE public.membership_fees ENABLE ROW LEVEL SECURITY;

-- Create policies for membership_fees
CREATE POLICY "Users can view their own membership fees"
ON public.membership_fees
FOR SELECT
USING (auth.uid() = member_id OR EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'treasurer', 'chairperson')
));

CREATE POLICY "Treasurer and admin can manage membership fees"
ON public.membership_fees
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'treasurer')
));

-- Create a function to initialize membership fee when profile is created
CREATE OR REPLACE FUNCTION initialize_membership_fee()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial membership fee entry
  INSERT INTO public.membership_fees (member_id, amount, fee_type, due_date, status)
  VALUES (
    NEW.id,
    200,
    'initial',
    CURRENT_DATE,
    'pending'
  );
  
  -- Set next renewal date to 1 year from registration
  NEW.next_membership_renewal_date := NEW.joined_at + INTERVAL '1 year';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize membership fee on profile creation
CREATE TRIGGER trigger_initialize_membership_fee
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_membership_fee();

-- Create a function to handle membership fee renewal
CREATE OR REPLACE FUNCTION create_renewal_fee(member_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.membership_fees (member_id, amount, fee_type, due_date, status)
  VALUES (
    member_id_param,
    200,
    'renewal',
    CURRENT_DATE,
    'pending'
  );
  
  -- Update next renewal date
  UPDATE public.profiles
  SET next_membership_renewal_date = now() + INTERVAL '1 year'
  WHERE id = member_id_param;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
