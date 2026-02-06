-- Add moderation fields and relax deadline requirement for pending jobs

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type public.job_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

alter table public.jobs
  alter column deadline drop not null;

alter table public.jobs
  add column if not exists status public.job_status not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists rejected_reason text;

alter table public.jobs
  drop constraint if exists jobs_approved_requires_deadline,
  add constraint jobs_approved_requires_deadline
    check (status <> 'approved' or deadline is not null);

create index if not exists jobs_status_idx on public.jobs (status);

drop policy if exists "Public jobs read" on public.jobs;
drop policy if exists "Official jobs read" on public.jobs;
drop policy if exists "Official jobs update" on public.jobs;

create policy "Public jobs read"
  on public.jobs
  for select
  using (status = 'approved' and deadline is not null and deadline >= now());

create policy "Official jobs read"
  on public.jobs
  for select
  using (public.is_official(auth.uid()));

create policy "Official jobs update"
  on public.jobs
  for update
  using (public.is_official(auth.uid()));

create or replace function public.delete_expired_jobs()
returns void
language sql
as $$
  delete from public.jobs where status = 'approved' and deadline is not null and deadline < now();
$$;
