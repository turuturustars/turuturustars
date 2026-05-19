-- WhatsApp smart assistant foundation:
-- - Registered-number session tracking.
-- - Inbound/outbound message audit log.
-- - Natural-language action audit trail linked to created finance records.

create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  profile_id uuid references public.profiles(id) on delete set null,
  preferred_language text not null default 'auto' check (preferred_language in ('auto', 'en', 'sw')),
  last_intent text,
  state jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_sessions_profile_idx
  on public.whatsapp_sessions (profile_id);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  phone text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  message_type text not null default 'text',
  body text,
  status text not null default 'received',
  provider_response jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_messages
  add column if not exists provider_message_id text,
  add column if not exists phone text,
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists body text,
  add column if not exists provider_response jsonb,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

create unique index if not exists whatsapp_messages_provider_message_id_key
  on public.whatsapp_messages (provider_message_id)
  where provider_message_id is not null;

create index if not exists whatsapp_messages_phone_created_idx
  on public.whatsapp_messages (phone, created_at desc);

create index if not exists whatsapp_messages_profile_created_idx
  on public.whatsapp_messages (profile_id, created_at desc);

create table if not exists public.whatsapp_actions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  phone text not null,
  inbound_message_id uuid references public.whatsapp_messages(id) on delete set null,
  outbound_message_id uuid references public.whatsapp_messages(id) on delete set null,
  intent text not null,
  confidence numeric(4, 3) not null default 0 check (confidence >= 0 and confidence <= 1),
  language text not null default 'auto',
  status text not null default 'received'
    check (status in ('received', 'completed', 'needs_clarification', 'failed', 'blocked')),
  input_text text not null,
  parsed jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  contribution_id uuid references public.contributions(id) on delete set null,
  expenditure_id uuid references public.expenditures(id) on delete set null,
  wallet_transaction_id uuid references public.wallet_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_actions_profile_created_idx
  on public.whatsapp_actions (profile_id, created_at desc);

create index if not exists whatsapp_actions_status_created_idx
  on public.whatsapp_actions (status, created_at desc);

drop trigger if exists set_updated_at_whatsapp_sessions on public.whatsapp_sessions;
create trigger set_updated_at_whatsapp_sessions
  before update on public.whatsapp_sessions
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_updated_at_whatsapp_actions on public.whatsapp_actions;
create trigger set_updated_at_whatsapp_actions
  before update on public.whatsapp_actions
  for each row
  execute function public.set_updated_at_timestamp();

alter table public.whatsapp_sessions enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_actions enable row level security;

drop policy if exists "Members can view own WhatsApp sessions" on public.whatsapp_sessions;
create policy "Members can view own WhatsApp sessions"
  on public.whatsapp_sessions
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Officials can view WhatsApp sessions" on public.whatsapp_sessions;
create policy "Officials can view WhatsApp sessions"
  on public.whatsapp_sessions
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Members can view own WhatsApp messages" on public.whatsapp_messages;
create policy "Members can view own WhatsApp messages"
  on public.whatsapp_messages
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Officials can view WhatsApp messages" on public.whatsapp_messages;
create policy "Officials can view WhatsApp messages"
  on public.whatsapp_messages
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Members can view own WhatsApp actions" on public.whatsapp_actions;
create policy "Members can view own WhatsApp actions"
  on public.whatsapp_actions
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Officials can view WhatsApp actions" on public.whatsapp_actions;
create policy "Officials can view WhatsApp actions"
  on public.whatsapp_actions
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

revoke all on public.whatsapp_sessions from anon;
revoke all on public.whatsapp_messages from anon;
revoke all on public.whatsapp_actions from anon;

grant select on public.whatsapp_sessions to authenticated;
grant select on public.whatsapp_messages to authenticated;
grant select on public.whatsapp_actions to authenticated;
