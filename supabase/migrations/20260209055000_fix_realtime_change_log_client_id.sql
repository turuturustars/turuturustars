-- Fix log_realtime_change() failing when auth.uid() is null/empty during signup triggers
-- Previous version used NULLIF(coalesce(auth.uid(), ''), '') which tried to cast '' to uuid and errored.

CREATE OR REPLACE FUNCTION public.log_realtime_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.realtime_change_log (
    id, table_name, record_id, change_type, old_values, new_values, changed_fields, client_id, created_at
  ) VALUES (
    gen_random_uuid(),
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    NULL,
    auth.uid(), -- allow null; avoid casting '' to uuid
    CURRENT_TIMESTAMP
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
