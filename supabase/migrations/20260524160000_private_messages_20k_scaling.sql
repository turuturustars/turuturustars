-- Scale private messages for large concurrent chat usage.
-- Key changes:
-- - recipient_id allows user-specific realtime filters instead of broad table listeners.
-- - summary/message RPCs collapse N+1 reads into one indexed query.
-- - send/start RPCs make chat writes atomic and race-safe.

alter table public.private_messages
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade;

update public.private_messages pm
set recipient_id = case
  when pm.sender_id = pc.participant_one then pc.participant_two
  when pm.sender_id = pc.participant_two then pc.participant_one
  else pm.recipient_id
end
from public.private_conversations pc
where pm.conversation_id = pc.id
  and pm.recipient_id is null;

create index if not exists private_messages_recipient_created_idx
  on public.private_messages (recipient_id, created_at desc)
  where recipient_id is not null;

create index if not exists private_messages_recipient_unread_idx
  on public.private_messages (recipient_id, conversation_id, created_at desc)
  where read_at is null and recipient_id is not null;

create index if not exists private_messages_conversation_id_created_id_idx
  on public.private_messages (conversation_id, created_at desc, id desc);

create index if not exists private_conversations_pair_reverse_idx
  on public.private_conversations (participant_two, participant_one);

create or replace function public.set_private_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_one uuid;
  v_participant_two uuid;
begin
  select pc.participant_one, pc.participant_two
  into v_participant_one, v_participant_two
  from public.private_conversations pc
  where pc.id = new.conversation_id;

  if v_participant_one is null then
    raise exception 'Conversation not found' using errcode = '23503';
  end if;

  if new.sender_id = v_participant_one then
    new.recipient_id := v_participant_two;
  elsif new.sender_id = v_participant_two then
    new.recipient_id := v_participant_one;
  else
    raise exception 'Sender is not a participant in this conversation' using errcode = '42501';
  end if;

  new.updated_at := coalesce(new.updated_at, now());
  return new;
end;
$$;

drop trigger if exists trg_set_private_message_recipient on public.private_messages;
create trigger trg_set_private_message_recipient
before insert on public.private_messages
for each row
execute function public.set_private_message_recipient();

drop policy if exists "Users can update read status of received messages" on public.private_messages;
drop policy if exists "Users can update own private messages" on public.private_messages;
create policy "Users can update own private messages"
  on public.private_messages
  for update
  to authenticated
  using (
    sender_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  )
  with check (
    sender_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists "Users can delete own private messages" on public.private_messages;
create policy "Users can delete own private messages"
  on public.private_messages
  for delete
  to authenticated
  using (
    sender_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

create or replace function public.start_private_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_participant_one uuid;
  v_participant_two uuid;
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.can_interact_with_system(v_user_id) then
    raise exception 'Your account is currently read-only' using errcode = '42501';
  end if;

  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception 'Choose another member to start a conversation' using errcode = '22023';
  end if;

  if not public.can_interact_with_system(p_other_user_id) then
    raise exception 'This member cannot receive private messages right now' using errcode = '42501';
  end if;

  select pc.id
  into v_conversation_id
  from public.private_conversations pc
  where (pc.participant_one = v_user_id and pc.participant_two = p_other_user_id)
     or (pc.participant_one = p_other_user_id and pc.participant_two = v_user_id)
  order by pc.updated_at desc
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  v_participant_one := least(v_user_id::text, p_other_user_id::text)::uuid;
  v_participant_two := greatest(v_user_id::text, p_other_user_id::text)::uuid;

  insert into public.private_conversations (participant_one, participant_two)
  values (v_participant_one, v_participant_two)
  on conflict (participant_one, participant_two)
  do update set updated_at = public.private_conversations.updated_at
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

grant execute on function public.start_private_conversation(uuid) to authenticated, service_role;

create or replace function public.send_private_message(
  p_conversation_id uuid,
  p_content text
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  recipient_id uuid,
  content text,
  read_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  sender_profile jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.can_interact_with_system(v_user_id) then
    raise exception 'Your account is currently read-only' using errcode = '42501';
  end if;

  p_content := btrim(coalesce(p_content, ''));
  if p_content = '' then
    raise exception 'Message cannot be empty' using errcode = '22023';
  end if;

  if length(p_content) > 1200 then
    raise exception 'Message is too long' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.private_conversations pc
    where pc.id = p_conversation_id
      and (pc.participant_one = v_user_id or pc.participant_two = v_user_id)
  ) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;

  insert into public.private_messages (conversation_id, sender_id, content)
  values (p_conversation_id, v_user_id, p_content)
  returning private_messages.id into v_message_id;

  update public.private_conversations pc
  set updated_at = now()
  where pc.id = p_conversation_id;

  return query
  select
    pm.id,
    pm.conversation_id,
    pm.sender_id,
    pm.recipient_id,
    pm.content,
    pm.read_at,
    pm.created_at,
    pm.updated_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'photo_url', p.photo_url
    ) as sender_profile
  from public.private_messages pm
  left join public.profiles p on p.id = pm.sender_id
  where pm.id = v_message_id;
end;
$$;

grant execute on function public.send_private_message(uuid, text) to authenticated, service_role;

create or replace function public.get_private_messages(
  p_conversation_id uuid,
  p_limit integer default 100,
  p_before timestamptz default null
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  recipient_id uuid,
  content text,
  read_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  sender_profile jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.private_conversations pc
    where pc.id = p_conversation_id
      and (pc.participant_one = v_user_id or pc.participant_two = v_user_id)
  ) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;

  return query
  select
    limited.id,
    limited.conversation_id,
    limited.sender_id,
    limited.recipient_id,
    limited.content,
    limited.read_at,
    limited.created_at,
    limited.updated_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'photo_url', p.photo_url
    ) as sender_profile
  from (
    select pm.*
    from public.private_messages pm
    where pm.conversation_id = p_conversation_id
      and (p_before is null or pm.created_at < p_before)
    order by pm.created_at desc, pm.id desc
    limit v_limit
  ) limited
  left join public.profiles p on p.id = limited.sender_id
  order by limited.created_at asc, limited.id asc;
end;
$$;

grant execute on function public.get_private_messages(uuid, integer, timestamptz) to authenticated, service_role;

create or replace function public.get_private_conversation_summaries(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  participant_one uuid,
  participant_two uuid,
  created_at timestamptz,
  updated_at timestamptz,
  other_participant jsonb,
  last_message jsonb,
  unread_count bigint,
  other_participant_presence jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  with user_conversations as (
    select
      pc.id,
      pc.participant_one,
      pc.participant_two,
      pc.created_at,
      pc.updated_at,
      case
        when pc.participant_one = v_user_id then pc.participant_two
        else pc.participant_one
      end as other_user_id
    from public.private_conversations pc
    where pc.participant_one = v_user_id
       or pc.participant_two = v_user_id
    order by pc.updated_at desc
    limit v_limit
    offset v_offset
  )
  select
    uc.id,
    uc.participant_one,
    uc.participant_two,
    uc.created_at,
    uc.updated_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'photo_url', p.photo_url
    ) as other_participant,
    case
      when lm.id is null then null
      else jsonb_build_object(
        'id', lm.id,
        'conversation_id', lm.conversation_id,
        'sender_id', lm.sender_id,
        'recipient_id', lm.recipient_id,
        'content', lm.content,
        'read_at', lm.read_at,
        'created_at', lm.created_at,
        'updated_at', lm.updated_at
      )
    end as last_message,
    (
      select count(*)
      from public.private_messages unread
      where unread.conversation_id = uc.id
        and unread.read_at is null
        and (
          unread.recipient_id = v_user_id
          or (unread.recipient_id is null and unread.sender_id <> v_user_id)
        )
    )::bigint as unread_count,
    jsonb_build_object(
      'status', coalesce(us.status, 'offline'),
      'last_seen', us.last_seen,
      'is_online', coalesce(us.status = 'online' and us.last_seen >= now() - interval '6 minutes', false)
    ) as other_participant_presence
  from user_conversations uc
  left join public.profiles p on p.id = uc.other_user_id
  left join public.user_status us on us.user_id = uc.other_user_id
  left join lateral (
    select pm.id, pm.conversation_id, pm.sender_id, pm.recipient_id, pm.content, pm.read_at, pm.created_at, pm.updated_at
    from public.private_messages pm
    where pm.conversation_id = uc.id
    order by pm.created_at desc, pm.id desc
    limit 1
  ) lm on true
  order by uc.updated_at desc;
end;
$$;

grant execute on function public.get_private_conversation_summaries(integer, integer) to authenticated, service_role;

create or replace function public.mark_private_conversation_read(_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  updated_rows integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not public.can_interact_with_system(v_user_id) then
    return 0;
  end if;

  if not exists (
    select 1
    from public.private_conversations pc
    where pc.id = _conversation_id
      and (pc.participant_one = v_user_id or pc.participant_two = v_user_id)
  ) then
    return 0;
  end if;

  update public.private_messages pm
  set read_at = now()
  where pm.conversation_id = _conversation_id
    and pm.read_at is null
    and (
      pm.recipient_id = v_user_id
      or (pm.recipient_id is null and pm.sender_id <> v_user_id)
    );

  get diagnostics updated_rows = row_count;
  return coalesce(updated_rows, 0);
end;
$$;

revoke all on function public.mark_private_conversation_read(uuid) from public;
grant execute on function public.mark_private_conversation_read(uuid) to authenticated;
grant execute on function public.mark_private_conversation_read(uuid) to service_role;
