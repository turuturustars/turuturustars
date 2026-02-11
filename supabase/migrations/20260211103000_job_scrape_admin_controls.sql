-- Move job scraping runtime controls from env vars to admin-managed tables.

CREATE TABLE IF NOT EXISTS public.job_scrape_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_per_source integer NOT NULL DEFAULT 20 CHECK (max_per_source >= 1 AND max_per_source <= 100),
  request_delay_ms integer NOT NULL DEFAULT 1200 CHECK (request_delay_ms >= 0 AND request_delay_ms <= 10000),
  job_max_priority integer NOT NULL DEFAULT 2 CHECK (job_max_priority >= 1 AND job_max_priority <= 10),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.job_scrape_settings (id, max_per_source, request_delay_ms, job_max_priority)
VALUES (1, 20, 1200, 2)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.job_scrape_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  priority integer NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 10),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS job_scrape_sources_name_unique_idx ON public.job_scrape_sources (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS job_scrape_sources_url_unique_idx ON public.job_scrape_sources (url);
CREATE INDEX IF NOT EXISTS job_scrape_sources_active_priority_idx ON public.job_scrape_sources (is_active, priority);

INSERT INTO public.job_scrape_sources (name, url, category, priority, is_active)
SELECT 'MyGov Job Adverts', 'https://www.mygov.go.ke/job-adverts', 'government_portal', 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_scrape_sources WHERE lower(name) = lower('MyGov Job Adverts')
);

INSERT INTO public.job_scrape_sources (name, url, category, priority, is_active)
SELECT 'Public Service Commission', 'https://www.publicservice.go.ke/', 'government_portal', 2, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_scrape_sources WHERE lower(name) = lower('Public Service Commission')
);

INSERT INTO public.job_scrape_sources (name, url, category, priority, is_active)
SELECT 'Murang''a County Government', 'http://muranga.go.ke/', 'county', 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_scrape_sources WHERE lower(name) = lower('Murang''a County Government')
);

ALTER TABLE public.job_scrape_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_scrape_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read scrape settings" ON public.job_scrape_settings;
DROP POLICY IF EXISTS "Admins insert scrape settings" ON public.job_scrape_settings;
DROP POLICY IF EXISTS "Admins update scrape settings" ON public.job_scrape_settings;
DROP POLICY IF EXISTS "Officials read scrape settings" ON public.job_scrape_settings;
DROP POLICY IF EXISTS "Officials insert scrape settings" ON public.job_scrape_settings;
DROP POLICY IF EXISTS "Officials update scrape settings" ON public.job_scrape_settings;

CREATE POLICY "Admins read scrape settings"
  ON public.job_scrape_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert scrape settings"
  ON public.job_scrape_settings
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update scrape settings"
  ON public.job_scrape_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read scrape sources" ON public.job_scrape_sources;
DROP POLICY IF EXISTS "Admins insert scrape sources" ON public.job_scrape_sources;
DROP POLICY IF EXISTS "Admins update scrape sources" ON public.job_scrape_sources;
DROP POLICY IF EXISTS "Admins delete scrape sources" ON public.job_scrape_sources;
DROP POLICY IF EXISTS "Officials read scrape sources" ON public.job_scrape_sources;
DROP POLICY IF EXISTS "Officials insert scrape sources" ON public.job_scrape_sources;
DROP POLICY IF EXISTS "Officials update scrape sources" ON public.job_scrape_sources;
DROP POLICY IF EXISTS "Officials delete scrape sources" ON public.job_scrape_sources;

CREATE POLICY "Admins read scrape sources"
  ON public.job_scrape_sources
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert scrape sources"
  ON public.job_scrape_sources
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update scrape sources"
  ON public.job_scrape_sources
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete scrape sources"
  ON public.job_scrape_sources
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_job_scrape_settings_updated_at ON public.job_scrape_settings;
CREATE TRIGGER update_job_scrape_settings_updated_at
BEFORE UPDATE ON public.job_scrape_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_job_scrape_sources_updated_at ON public.job_scrape_sources;
CREATE TRIGGER update_job_scrape_sources_updated_at
BEFORE UPDATE ON public.job_scrape_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
