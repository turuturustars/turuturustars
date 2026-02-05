-- Ensure notifications table has all columns used by the app
alter table public.notifications
  add column if not exists action_url text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists read_at timestamptz;

-- Backfill updated_at for existing rows
update public.notifications
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
