-- Fix chat schema for room-based messages and user status

-- Add room_id to messages for global rooms (default to 'global')
alter table public.messages
  add column if not exists room_id text not null default 'global';

create index if not exists idx_messages_room_id on public.messages(room_id);

-- User presence/status table used by chat sidebar
create table if not exists public.user_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'online',
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_status enable row level security;

create policy "Users can view all statuses" on public.user_status
  for select using (auth.uid() is not null);

create policy "Users can upsert their status" on public.user_status
  for insert with check (auth.uid() = user_id);

create policy "Users can update their status" on public.user_status
  for update using (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_status;

create index if not exists idx_user_status_updated_at on public.user_status(updated_at desc);
