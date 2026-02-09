-- Ensure public can insert donations when RLS permits
GRANT INSERT ON public.donations TO anon, authenticated;
GRANT SELECT ON public.donations TO anon, authenticated;