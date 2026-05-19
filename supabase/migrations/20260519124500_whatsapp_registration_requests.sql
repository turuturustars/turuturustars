-- Guided WhatsApp registration-interest capture with email OTP verification.
-- This table intentionally stays separate from profiles because profiles are
-- tied to auth.users; verified requests can be reviewed or converted by admins.

create table if not exists public.whatsapp_registration_requests (
  id uuid primary key default gen_random_uuid(),
  whatsapp_phone text not null unique,
  registration_phone text not null,
  email text,
  email_verified_at timestamptz,
  email_otp_hash text,
  email_otp_expires_at timestamptz,
  email_otp_attempts integer not null default 0,
  email_otp_sent_at timestamptz,
  full_name text,
  id_number text,
  location text,
  occupation text,
  employment_status text,
  education_level text,
  interests text[] not null default '{}'::text[],
  additional_notes text,
  profile_progress integer not null default 0 check (profile_progress >= 0 and profile_progress <= 100),
  profile_completed_at timestamptz,
  status text not null default 'started'
    check (status in (
      'started',
      'awaiting_email',
      'awaiting_email_otp',
      'email_verified',
      'needs_email_support',
      'profile_started',
      'profile_completed',
      'cancelled',
      'converted',
      'expired'
    )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_registration_requests_status_created_idx
  on public.whatsapp_registration_requests (status, created_at desc);

create index if not exists whatsapp_registration_requests_email_idx
  on public.whatsapp_registration_requests (lower(email))
  where email is not null;

drop trigger if exists set_updated_at_whatsapp_registration_requests on public.whatsapp_registration_requests;
create trigger set_updated_at_whatsapp_registration_requests
  before update on public.whatsapp_registration_requests
  for each row
  execute function public.set_updated_at_timestamp();

alter table public.whatsapp_registration_requests enable row level security;

drop policy if exists "Officials can view WhatsApp registration requests" on public.whatsapp_registration_requests;
create policy "Officials can view WhatsApp registration requests"
  on public.whatsapp_registration_requests
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Officials can update WhatsApp registration requests" on public.whatsapp_registration_requests;
create policy "Officials can update WhatsApp registration requests"
  on public.whatsapp_registration_requests
  for update
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'patron')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'patron')
  );

revoke all on public.whatsapp_registration_requests from anon;
revoke all on public.whatsapp_registration_requests from authenticated;
grant select, update on public.whatsapp_registration_requests to authenticated;
