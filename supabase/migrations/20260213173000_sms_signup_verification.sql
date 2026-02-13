-- SMS signup verification flow:
-- - store short-lived OTP sessions
-- - issue verification tokens after OTP confirm
-- - enforce token + normalized phone before auth user creation

create extension if not exists pgcrypto;

create table if not exists public.sms_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('signup')),
  phone text not null check (phone ~ '^\+254[17][0-9]{8}$'),
  code_hash text not null,
  verification_token text,
  token_expires_at timestamptz,
  sends_count integer not null default 1 check (sends_count >= 1),
  verify_attempts integer not null default 0 check (verify_attempts >= 0),
  max_verify_attempts integer not null default 5 check (max_verify_attempts between 1 and 20),
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  last_sent_at timestamptz not null default now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_verification_sessions_purpose_phone_created_idx
  on public.sms_verification_sessions (purpose, phone, created_at desc);

create index if not exists sms_verification_sessions_active_idx
  on public.sms_verification_sessions (purpose, phone, expires_at desc)
  where verified_at is null and consumed_at is null;

create unique index if not exists sms_verification_sessions_verification_token_uniq
  on public.sms_verification_sessions (verification_token)
  where verification_token is not null;

alter table public.sms_verification_sessions enable row level security;

revoke all on table public.sms_verification_sessions from anon, authenticated;

drop trigger if exists update_sms_verification_sessions_updated_at on public.sms_verification_sessions;
create trigger update_sms_verification_sessions_updated_at
before update on public.sms_verification_sessions
for each row
execute function public.update_updated_at();

create or replace function public.consume_sms_verification_token(
  _purpose text,
  _phone text,
  _verification_token text,
  _consumer uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed_id uuid;
begin
  if _purpose is null or _phone is null or _verification_token is null then
    return false;
  end if;

  with candidate as (
    select s.id
    from public.sms_verification_sessions s
    where s.purpose = _purpose
      and s.phone = _phone
      and s.verification_token = _verification_token
      and s.verified_at is not null
      and s.consumed_at is null
      and s.token_expires_at is not null
      and s.token_expires_at > now()
    order by s.verified_at desc
    limit 1
    for update skip locked
  )
  update public.sms_verification_sessions s
  set
    consumed_at = now(),
    consumed_by = coalesce(_consumer, s.consumed_by),
    updated_at = now()
  from candidate
  where s.id = candidate.id
  returning s.id into v_claimed_id;

  return v_claimed_id is not null;
end;
$$;

create or replace function public.enforce_signup_phone_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
  v_phone_raw text;
  v_phone text;
  v_token text;
  v_consumed boolean;
begin
  v_provider := lower(coalesce(new.raw_app_meta_data ->> 'provider', ''));
  if v_provider <> 'email' then
    return new;
  end if;

  v_phone_raw := coalesce(new.raw_user_meta_data ->> 'phone', '');
  v_phone := public.normalize_kenyan_phone(v_phone_raw);
  if v_phone is null then
    raise exception 'A valid Kenyan phone number is required for signup verification.'
      using errcode = '22023';
  end if;

  v_token := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_verification_token', '')), '');
  if v_token is null then
    raise exception 'Phone verification token missing. Verify your number via SMS first.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles p
    where public.normalize_kenyan_phone(p.phone) = v_phone
      and p.id <> new.id
      and coalesce(p.soft_deleted, false) = false
  ) then
    raise exception 'This phone number is already linked to another account.'
      using errcode = '23505';
  end if;

  v_consumed := public.consume_sms_verification_token('signup', v_phone, v_token, new.id);
  if not v_consumed then
    raise exception 'Phone verification expired or invalid. Request a new SMS code.'
      using errcode = '22023';
  end if;

  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  new.raw_user_meta_data := jsonb_set(new.raw_user_meta_data, '{phone}', to_jsonb(v_phone), true);
  new.raw_user_meta_data := new.raw_user_meta_data - 'phone_verification_token';

  return new;
end;
$$;

drop trigger if exists on_auth_user_require_verified_phone on auth.users;
create trigger on_auth_user_require_verified_phone
before insert on auth.users
for each row
execute function public.enforce_signup_phone_verification();
