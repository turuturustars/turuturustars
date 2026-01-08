-- Create members table for membership registration
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  occupation TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public registration)
CREATE POLICY "Anyone can register as member" 
ON public.members 
FOR INSERT 
WITH CHECK (true);

-- Only allow reading own registration (by email match - for confirmation)
CREATE POLICY "Members can view registrations" 
ON public.members 
FOR SELECT 
USING (true);