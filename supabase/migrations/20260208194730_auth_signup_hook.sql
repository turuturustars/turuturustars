-- Supabase Auth Hook: create baseline profile + notification preferences on signup
-- This function is referenced from Supabase Dashboard -> Authentication -> Hooks

create or replace function public.auth_signup_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  user_email text;
  full_name text;
  phone text;
begin
  uid := (event->'user'->>'id')::uuid;
  user_email := event->'user'->>'email';
  full_name := coalesce(nullif(trim(event->'user'->'user_metadata'->>'full_name'), ''), 'Member');
  phone := coalesce(nullif(trim(event->'user'->'user_metadata'->>'phone'), ''), '0000000000');

  -- Create baseline profile if missing
  insert into public.profiles (id, email, full_name, phone, status, membership_number)
  values (uid, user_email, full_name, phone, 'pending', public.generate_membership_number())
  on conflict (id) do nothing;

  -- Create default notification preferences
  insert into public.notification_preferences (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  return event;
end;
$$;
