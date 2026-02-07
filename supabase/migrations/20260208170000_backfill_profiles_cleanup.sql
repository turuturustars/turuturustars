-- Backfill any remaining auth users missing baseline records (profiles, roles, tracking, notification prefs)

do $$
declare
  r record;
begin
  for r in
    select u.id,
           coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), 'Member') as full_name,
           nullif(trim(coalesce(u.raw_user_meta_data ->> 'phone', '')), '') as phone,
           u.email
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
      and length(u.id::text) = 36  -- skip malformed ids
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

-- Ensure member role
insert into public.user_roles (user_id, role)
select p.id, 'member'
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id and ur.role = 'member'
where ur.user_id is null;

-- Ensure contribution tracking
insert into public.contribution_tracking (member_id)
select p.id
from public.profiles p
left join public.contribution_tracking ct on ct.member_id = p.id
where ct.member_id is null;

-- Ensure notification preferences
insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
left join public.notification_preferences np on np.user_id = p.id
where np.user_id is null;
