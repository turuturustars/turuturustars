-- Track WhatsApp conversation pauses so the assistant can close quiet
-- back-and-forth prompts and greet members warmly when they return.

alter table public.whatsapp_sessions
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists awaiting_response boolean not null default false,
  add column if not exists awaiting_response_since timestamptz,
  add column if not exists inactivity_notice_sent_at timestamptz,
  add column if not exists abandoned_at timestamptz,
  add column if not exists welcome_back_sent_at timestamptz;

create index if not exists whatsapp_sessions_awaiting_response_idx
  on public.whatsapp_sessions (awaiting_response_since, last_inbound_at, last_outbound_at)
  where awaiting_response = true and inactivity_notice_sent_at is null;

create index if not exists whatsapp_sessions_abandoned_idx
  on public.whatsapp_sessions (abandoned_at desc)
  where abandoned_at is not null;
