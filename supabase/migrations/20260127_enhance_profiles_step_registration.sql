-- Enhance profiles table with additional registration fields
-- This allows storing more detailed user information from the step-by-step registration

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS employment_status TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS additional_notes TEXT,
ADD COLUMN IF NOT EXISTS registration_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_progress INTEGER DEFAULT 0;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_registration_completed ON profiles(registration_completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_education_level ON profiles(education_level);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.employment_status IS 'Employment status: employed, self-employed, unemployed, student, retired';
COMMENT ON COLUMN public.profiles.interests IS 'Array of user interests/areas of interest';
COMMENT ON COLUMN public.profiles.education_level IS 'Highest level of education: primary, secondary, certificate, diploma, bachelors, masters, phd';
COMMENT ON COLUMN public.profiles.additional_notes IS 'Additional information provided by user during registration';
COMMENT ON COLUMN public.profiles.registration_completed_at IS 'Timestamp when full registration was completed';
COMMENT ON COLUMN public.profiles.registration_progress IS 'Registration progress percentage (0-100)';
