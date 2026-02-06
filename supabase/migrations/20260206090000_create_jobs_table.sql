-- Jobs aggregation table for community listings

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_type') then
    create type public.job_type as enum (
      'casual',
      'contract',
      'part_time',
      'full_time',
      'permanent',
      'temporary',
      'internship',
      'volunteer',
      'other'
    );
  end if;
end $$;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null,
  location text not null,
  county text not null,
  job_type public.job_type not null default 'other',
  deadline timestamptz not null,
  posted_at timestamptz not null default now(),
  source_name text not null,
  source_url text not null,
  apply_url text,
  excerpt text,
  external_id text,
  is_government boolean not null default false,
  is_priority_location boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists jobs_source_url_key on public.jobs (source_url);
create unique index if not exists jobs_source_external_id_key on public.jobs (source_name, external_id)
  where external_id is not null;
create index if not exists jobs_deadline_idx on public.jobs (deadline);
create index if not exists jobs_county_idx on public.jobs (county);
create index if not exists jobs_job_type_idx on public.jobs (job_type);
create index if not exists jobs_priority_idx on public.jobs (is_priority_location);
create index if not exists jobs_posted_at_idx on public.jobs (posted_at);

create or replace function public.set_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_jobs_updated_at();

alter table public.jobs enable row level security;

drop policy if exists "Public jobs read" on public.jobs;
create policy "Public jobs read"
  on public.jobs
  for select
  using (deadline >= now());

create or replace function public.delete_expired_jobs()
returns void
language sql
as $$
  delete from public.jobs where deadline < now();
$$;
