-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('member', 'management_committee', 'agm', 'special')),
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  agenda TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meeting attendance table
CREATE TABLE public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  attended BOOLEAN DEFAULT false,
  apology_sent BOOLEAN DEFAULT false,
  apology_reason TEXT,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  marked_by UUID,
  UNIQUE(meeting_id, member_id)
);

-- Create discipline records table
CREATE TABLE public.discipline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  fine_amount NUMERIC DEFAULT 0,
  fine_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'appealed', 'dismissed')),
  recorded_by UUID NOT NULL,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create role handover table for acting appointments
CREATE TABLE public.role_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL,
  acting_user_id UUID NOT NULL,
  role app_role NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create voting motions table
CREATE TABLE public.voting_motions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id),
  title TEXT NOT NULL,
  description TEXT,
  motion_type TEXT DEFAULT 'simple' CHECK (motion_type IN ('simple', 'special', 'constitutional')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'closed', 'passed', 'failed', 'tied')),
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  tie_breaker_vote TEXT,
  tie_breaker_by UUID,
  opened_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motion_id UUID NOT NULL REFERENCES public.voting_motions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('for', 'against', 'abstain')),
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(motion_id, member_id)
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_motions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has management committee role
CREATE OR REPLACE FUNCTION public.is_management_committee(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'chairperson', 'vice_chairman', 'secretary', 'vice_secretary', 'treasurer', 'organizing_secretary')
  )
$$;

-- Meetings policies - authenticated members can view
CREATE POLICY "Authenticated can view meetings" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "MC can insert meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (is_management_committee(auth.uid()));
CREATE POLICY "MC can update meetings" ON public.meetings FOR UPDATE TO authenticated USING (is_management_committee(auth.uid()));
CREATE POLICY "MC can delete meetings" ON public.meetings FOR DELETE TO authenticated USING (is_management_committee(auth.uid()));

-- Meeting attendance policies
CREATE POLICY "Members view own or officials view all attendance" ON public.meeting_attendance FOR SELECT TO authenticated USING (member_id = auth.uid() OR is_official(auth.uid()));
CREATE POLICY "MC can insert attendance" ON public.meeting_attendance FOR INSERT TO authenticated WITH CHECK (is_management_committee(auth.uid()));
CREATE POLICY "MC can update attendance" ON public.meeting_attendance FOR UPDATE TO authenticated USING (is_management_committee(auth.uid()));
CREATE POLICY "MC can delete attendance" ON public.meeting_attendance FOR DELETE TO authenticated USING (is_management_committee(auth.uid()));

-- Discipline records policies
CREATE POLICY "View own or officials view discipline" ON public.discipline_records FOR SELECT TO authenticated USING (member_id = auth.uid() OR is_official(auth.uid()));
CREATE POLICY "Org sec and admin can insert discipline" ON public.discipline_records FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'organizing_secretary'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'chairperson'::app_role)
);
CREATE POLICY "Org sec and admin can update discipline" ON public.discipline_records FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'organizing_secretary'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'chairperson'::app_role)
);
CREATE POLICY "Org sec and admin can delete discipline" ON public.discipline_records FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'chairperson'::app_role)
);

-- Role handovers policies
CREATE POLICY "MC or involved can view handovers" ON public.role_handovers FOR SELECT TO authenticated USING (
  is_management_committee(auth.uid()) OR original_user_id = auth.uid() OR acting_user_id = auth.uid()
);
CREATE POLICY "Admin and chair can insert handovers" ON public.role_handovers FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'chairperson'::app_role)
);
CREATE POLICY "Admin and chair can update handovers" ON public.role_handovers FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'chairperson'::app_role)
);
CREATE POLICY "Admin and chair can delete handovers" ON public.role_handovers FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'chairperson'::app_role)
);

-- Voting motions policies - authenticated members can view
CREATE POLICY "Authenticated can view motions" ON public.voting_motions FOR SELECT TO authenticated USING (true);
CREATE POLICY "MC can insert motions" ON public.voting_motions FOR INSERT TO authenticated WITH CHECK (is_management_committee(auth.uid()));
CREATE POLICY "MC can update motions" ON public.voting_motions FOR UPDATE TO authenticated USING (is_management_committee(auth.uid()));
CREATE POLICY "MC can delete motions" ON public.voting_motions FOR DELETE TO authenticated USING (is_management_committee(auth.uid()));

-- Votes policies - authenticated members can view
CREATE POLICY "Authenticated can view votes" ON public.votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can cast vote" ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = member_id);

-- Add consecutive_absences tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consecutive_absences INTEGER DEFAULT 0;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voting_motions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;