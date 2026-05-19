-- WhatsApp conversation ratings:
-- - Members can reply with a rating emoji after an assistant response.
-- - Ratings are linked back to the inbound rating message and latest outbound assistant message.

create table if not exists public.whatsapp_conversation_ratings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  phone text not null,
  inbound_message_id uuid references public.whatsapp_messages(id) on delete set null,
  rated_message_id uuid references public.whatsapp_messages(id) on delete set null,
  rated_action_id uuid references public.whatsapp_actions(id) on delete set null,
  rating_emoji text not null,
  rating_score integer not null check (rating_score between 1 and 5),
  rating_label text not null,
  raw_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_conversation_ratings_profile_created_idx
  on public.whatsapp_conversation_ratings (profile_id, created_at desc);

create index if not exists whatsapp_conversation_ratings_score_created_idx
  on public.whatsapp_conversation_ratings (rating_score, created_at desc);

alter table public.whatsapp_conversation_ratings enable row level security;

drop policy if exists "Members can view own WhatsApp conversation ratings" on public.whatsapp_conversation_ratings;
create policy "Members can view own WhatsApp conversation ratings"
  on public.whatsapp_conversation_ratings
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Officials can view WhatsApp conversation ratings" on public.whatsapp_conversation_ratings;
create policy "Officials can view WhatsApp conversation ratings"
  on public.whatsapp_conversation_ratings
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

revoke all on public.whatsapp_conversation_ratings from anon;
grant select on public.whatsapp_conversation_ratings to authenticated;
