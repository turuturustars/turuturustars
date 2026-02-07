-- Reinstate unified signup bootstrap and backfill existing users

-- Single trigger to create baseline records for every auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- Ensure only one trigger handles bootstrap work
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_notification_prefs on auth.users;

-- Backfill missing baseline records for existing auth users
do $$
declare
  r record;
begin
  for r in
    select
      u.id,
      coalesce(u.raw_user_meta_data ->> 'full_name', 'New Member') as full_name,
      coalesce(u.raw_user_meta_data ->> 'phone', '') as phone,
      u.email
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    begin
      insert into public.profiles (id, full_name, phone, email, membership_number, status)
      values (r.id, r.full_name, r.phone, r.email, public.generate_membership_number(), 'pending')
      on conflict (id) do nothing;
    exception when others then
      raise notice 'Skipping profile backfill for user % due to: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;

-- Ensure any legacy profiles without membership numbers get one
update public.profiles
set membership_number = public.generate_membership_number()
where membership_number is null;

do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    left join public.user_roles ur on ur.user_id = p.id and ur.role = 'member'
    where ur.user_id is null
  loop
    begin
      insert into public.user_roles (user_id, role)
      values (r.id, 'member')
      on conflict (user_id, role) do nothing;
    exception when others then
      raise notice 'Skipping user_roles backfill for user % due to: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    left join public.contribution_tracking ct on ct.member_id = p.id
    where ct.member_id is null
  loop
    begin
      insert into public.contribution_tracking (member_id)
      values (r.id)
      on conflict (member_id) do nothing;
    exception when others then
      raise notice 'Skipping contribution_tracking backfill for user % due to: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    left join public.notification_preferences np on np.user_id = p.id
    where np.user_id is null
  loop
    begin
      insert into public.notification_preferences (user_id)
      values (r.id)
      on conflict (user_id) do nothing;
    exception when others then
      raise notice 'Skipping notification_preferences backfill for user % due to: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;
