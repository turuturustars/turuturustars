-- Create jobs table for storing scraped job listings
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Kenya',
  county TEXT NOT NULL DEFAULT 'Kenya',
  job_type TEXT NOT NULL DEFAULT 'other' CHECK (job_type IN ('casual', 'contract', 'part_time', 'full_time', 'permanent', 'temporary', 'internship', 'volunteer', 'other')),
  deadline DATE,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  apply_url TEXT,
  excerpt TEXT,
  external_id TEXT,
  is_government BOOLEAN NOT NULL DEFAULT false,
  is_priority_location BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT jobs_source_url_unique UNIQUE (source_url),
  CONSTRAINT jobs_source_external_id_unique UNIQUE (source_name, external_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON public.jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_county ON public.jobs(county);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON public.jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_is_priority ON public.jobs(is_priority_location);
CREATE INDEX IF NOT EXISTS idx_jobs_source_name ON public.jobs(source_name);

-- Enable RLS
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for approved jobs with valid deadlines
DROP POLICY IF EXISTS "Anyone can view approved jobs" ON public.jobs;
CREATE POLICY "Anyone can view approved jobs"
ON public.jobs
FOR SELECT
USING (status = 'approved' AND (deadline IS NULL OR deadline >= CURRENT_DATE));

-- Admins can manage all jobs
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
CREATE POLICY "Admins can manage all jobs"
ON public.jobs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Function to delete expired jobs (deadline passed by more than 7 days)
DROP FUNCTION IF EXISTS public.delete_expired_jobs();
CREATE OR REPLACE FUNCTION public.delete_expired_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.jobs
  WHERE deadline < (CURRENT_DATE - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
