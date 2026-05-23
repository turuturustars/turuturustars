-- Prevent active member profiles from sharing the same registered phone number.
-- This guards regular web signup, OAuth profile completion, admin-created members,
-- and concurrent requests that pass app-layer checks at the same time.

create or replace function public.profile_phone_is_registered(
  _raw_phone text,
  _exclude_profile_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := public.normalize_kenyan_phone(_raw_phone);
  if v_phone is null then
    return false;
  end if;

  return exists (
    select 1
    from public.profiles p
    where public.normalize_kenyan_phone(p.phone) = v_phone
      and (_exclude_profile_id is null or p.id <> _exclude_profile_id)
      and coalesce(p.soft_deleted, false) = false
      and p.phone !~* '^REJECTED-'
  );
end;
$$;

revoke execute on function public.profile_phone_is_registered(text, uuid) from public, anon, authenticated;
grant execute on function public.profile_phone_is_registered(text, uuid) to service_role;

create or replace function public.normalize_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  if new.phone is null or btrim(new.phone) = '' then
    return new;
  end if;

  -- Preserve admin redaction values used on rejected/suspended accounts.
  if new.phone ~* '^REJECTED-' then
    return new;
  end if;

  v_phone := public.normalize_kenyan_phone(new.phone);
  if v_phone is null then
    raise exception
      'Invalid Kenyan mobile number. Use 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +2547XXXXXXXX, or +2541XXXXXXXX.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_phone, 0));

  if public.profile_phone_is_registered(v_phone, new.id) then
    raise exception 'This phone number is already linked to another account.'
      using errcode = '23505';
  end if;

  new.phone := v_phone;
  return new;
end;
$$;

drop trigger if exists trg_normalize_profile_phone on public.profiles;
create trigger trg_normalize_profile_phone
before insert or update of phone on public.profiles
for each row
execute function public.normalize_profile_phone();
