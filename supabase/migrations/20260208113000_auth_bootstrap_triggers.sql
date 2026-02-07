-- Recreate bootstrap triggers to ensure profiles and notification preferences exist for every auth user

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create profile if missing
  insert into public.profiles (id, full_name, phone, email, membership_number, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New Member'),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    public.generate_membership_number(),
    'pending'
  )
  on conflict (id) do nothing;

  -- Create contribution tracking if missing
  insert into public.contribution_tracking (member_id)
  values (new.id)
  on conflict (member_id) do nothing;

  return new;
end;
$$;

create or replace function public.create_default_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Ensure triggers exist
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_notification_prefs on auth.users;
create trigger on_auth_user_notification_prefs
  after insert on auth.users
  for each row execute function public.create_default_notification_preferences();
