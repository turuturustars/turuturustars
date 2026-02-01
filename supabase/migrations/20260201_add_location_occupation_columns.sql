-- Add missing location and occupation columns to profiles table
-- This fixes the "Could not find the 'location' column of 'profiles' in the schema cache" error

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Create index on location for potential future queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);

-- Ensure the trigger function has these columns available
-- The handle_new_user function should already be using these columns
