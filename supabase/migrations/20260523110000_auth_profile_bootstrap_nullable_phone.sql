-- Keep auth-created profiles compatible with strict Kenyan phone validation.
-- OAuth, diagnostics, and older signup paths may not provide a phone number.
-- Store NULL in that case instead of the old invalid placeholder 0000000000.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := public.normalize_kenyan_phone(nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''));

  insert into public.profiles (id, full_name, phone, email, membership_number, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Member'),
    v_phone,
    new.email,
    public.generate_membership_number(),
    'pending'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id, role) do nothing;

  insert into public.contribution_tracking (member_id)
  values (new.id)
  on conflict (member_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

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
  phone := public.normalize_kenyan_phone(nullif(trim(coalesce(event->'user'->'user_metadata'->>'phone', '')), ''));

  insert into public.profiles (id, email, full_name, phone, status, membership_number)
  values (uid, user_email, full_name, phone, 'pending', public.generate_membership_number())
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  return event;
end;
$$;

update public.profiles
set phone = null,
    updated_at = now()
where phone = '0000000000';
