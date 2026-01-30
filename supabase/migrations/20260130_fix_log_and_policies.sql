-- Fix logging function and add conservative SELECT policies where missing
-- Created: 2026-01-30

-- 1) Replace log_realtime_change() with a simpler, robust implementation
CREATE OR REPLACE FUNCTION public.log_realtime_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.realtime_change_log (
    id, table_name, record_id, change_type, old_values, new_values, changed_fields, client_id, created_at
  ) VALUES (
    gen_random_uuid(),
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    NULL,
    NULLIF(coalesce(auth.uid(), ''), ''),
    CURRENT_TIMESTAMP
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- 2) Ensure current_user_id() exists and returns auth.uid() safely
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid()::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_realtime_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;

-- 3) Add conservative SELECT policies for RLS-enabled tables if no policy exists with the chosen name
-- We use guarded CREATE via checking pg_policy to avoid overwriting existing policies with different names.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_profiles' AND polrelid = 'public.profiles'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_user_roles' AND polrelid = 'public.user_roles'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for user_roles" ON public.user_roles FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_welfare_cases' AND polrelid = 'public.welfare_cases'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for welfare_cases" ON public.welfare_cases FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_contributions' AND polrelid = 'public.contributions'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for contributions" ON public.contributions FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_contribution_tracking' AND polrelid = 'public.contribution_tracking'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for contribution_tracking" ON public.contribution_tracking FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_notifications' AND polrelid = 'public.notifications'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_announcements' AND polrelid = 'public.announcements'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for announcements" ON public.announcements FOR SELECT USING (published = true OR public.is_official(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_messages' AND polrelid = 'public.messages'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for messages" ON public.messages FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_message_reactions' AND polrelid = 'public.message_reactions'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for message_reactions" ON public.message_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_private_conversations' AND polrelid = 'public.private_conversations'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for private_conversations" ON public.private_conversations FOR SELECT USING (auth.uid() = participant_one OR auth.uid() = participant_two);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_private_messages' AND polrelid = 'public.private_messages'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for private_messages" ON public.private_messages FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.private_conversations WHERE id = conversation_id AND (participant_one = auth.uid() OR participant_two = auth.uid()))
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_typing_indicators' AND polrelid = 'public.typing_indicators'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for typing_indicators" ON public.typing_indicators FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'conservative_select_realtime_change_log' AND polrelid = 'public.realtime_change_log'::regclass) THEN
    CREATE POLICY "Conservative select (20260130) for realtime_change_log" ON public.realtime_change_log FOR SELECT USING (public.is_official(auth.uid()));
  END IF;
END;
$$;

-- Ensure authenticated role has select on realtime_change_log table
GRANT SELECT ON TABLE public.realtime_change_log TO authenticated;

-- End migration
