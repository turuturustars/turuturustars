-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'treasurer', 'secretary', 'chairperson', 'coordinator', 'member');

-- Create member status enum
CREATE TYPE public.member_status AS ENUM ('active', 'dormant', 'pending', 'suspended');

-- Create contribution status enum
CREATE TYPE public.contribution_status AS ENUM ('paid', 'pending', 'missed');

-- Create profiles table for extended user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  id_number TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,
  membership_number TEXT UNIQUE,
  status member_status DEFAULT 'pending',
  is_student BOOLEAN DEFAULT FALSE,
  registration_fee_paid BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Create welfare_cases table
CREATE TABLE public.welfare_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  case_type TEXT NOT NULL, -- bereavement, medical, education, etc.
  beneficiary_id UUID REFERENCES public.profiles(id),
  target_amount DECIMAL(12,2),
  collected_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, closed, cancelled
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create contributions table
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  welfare_case_id UUID REFERENCES public.welfare_cases(id),
  amount DECIMAL(10,2) NOT NULL,
  contribution_type TEXT NOT NULL, -- registration, welfare, monthly, project
  status contribution_status DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create missed_contributions tracking (for dormancy rules)
CREATE TABLE public.contribution_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  consecutive_missed INTEGER DEFAULT 0,
  last_contribution_date DATE,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- contribution_reminder, dormant_warning, welfare_case, announcement
  read BOOLEAN DEFAULT FALSE,
  sent_via TEXT[], -- email, sms, whatsapp, push
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welfare_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is any official (admin, treasurer, secretary, chairperson, coordinator)
CREATE OR REPLACE FUNCTION public.is_official(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'treasurer', 'secretary', 'chairperson', 'coordinator')
  )
$$;

-- Generate membership number
CREATE OR REPLACE FUNCTION public.generate_membership_number()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, membership_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New Member'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    NEW.email,
    generate_membership_number()
  );
  
  -- Assign default member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  -- Create contribution tracking record
  INSERT INTO public.contribution_tracking (member_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Officials can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_official(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Officials can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_official(auth.uid()));

CREATE POLICY "Profiles created via trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for welfare_cases
CREATE POLICY "All authenticated users can view welfare cases"
  ON public.welfare_cases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Officials can manage welfare cases"
  ON public.welfare_cases FOR ALL
  USING (public.is_official(auth.uid()));

-- RLS Policies for contributions
CREATE POLICY "Users can view their own contributions"
  ON public.contributions FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Officials can view all contributions"
  ON public.contributions FOR SELECT
  USING (public.is_official(auth.uid()));

CREATE POLICY "Users can create their own contributions"
  ON public.contributions FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Officials can manage all contributions"
  ON public.contributions FOR ALL
  USING (public.is_official(auth.uid()));

-- RLS Policies for contribution_tracking
CREATE POLICY "Users can view their own tracking"
  ON public.contribution_tracking FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Officials can view all tracking"
  ON public.contribution_tracking FOR SELECT
  USING (public.is_official(auth.uid()));

CREATE POLICY "Officials can update tracking"
  ON public.contribution_tracking FOR UPDATE
  USING (public.is_official(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Officials can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_official(auth.uid()));

-- RLS Policies for announcements
CREATE POLICY "Anyone can view published announcements"
  ON public.announcements FOR SELECT
  USING (published = true);

CREATE POLICY "Officials can view all announcements"
  ON public.announcements FOR SELECT
  USING (public.is_official(auth.uid()));

CREATE POLICY "Officials can manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_official(auth.uid()));