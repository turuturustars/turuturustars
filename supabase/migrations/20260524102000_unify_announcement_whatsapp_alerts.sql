-- Keep announcements, dashboard notifications, and WhatsApp alerts on one path.
-- Publishing an announcement now creates the in-app notification and queues the
-- WhatsApp alert through the same idempotent function.

alter table public.whatsapp_sessions
  add column if not exists conversation_summary jsonb not null default '{}'::jsonb,
  add column if not exists conversation_summary_updated_at timestamptz;

alter table public.whatsapp_notifications_queue
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists template_name text,
  add column if not exists template_language text,
  add column if not exists template_parameters jsonb not null default '[]'::jsonb;

create index if not exists whatsapp_notifications_queue_dead_letter_idx
  on public.whatsapp_notifications_queue (dead_lettered_at desc)
  where dead_lettered_at is not null;

create index if not exists whatsapp_notifications_queue_next_attempt_idx
  on public.whatsapp_notifications_queue (status, next_attempt_at asc, created_at asc);

create or replace function public.enqueue_announcement_member_alerts(
  p_announcement_id uuid,
  p_title text default null,
  p_message text default null,
  p_priority text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_announcement record;
  v_actor_role public.app_role;
  v_title text;
  v_message text;
  v_priority text;
  v_action_url text;
  v_whatsapp_message text;
  v_inserted integer := 0;
begin
  select id, title, content, priority, published
  into v_announcement
  from public.announcements
  where id = p_announcement_id;

  if not found or coalesce(v_announcement.published, false) is not true then
    return 0;
  end if;

  v_title := coalesce(nullif(btrim(p_title), ''), nullif(btrim(v_announcement.title), ''), 'Announcement');
  v_message := coalesce(nullif(btrim(p_message), ''), nullif(btrim(v_announcement.content), ''), v_title);
  v_priority := lower(coalesce(nullif(btrim(p_priority), ''), nullif(btrim(v_announcement.priority), ''), 'normal'));

  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'normal';
  end if;

  v_action_url := '/dashboard/communication/announcements#' || p_announcement_id::text;
  v_whatsapp_message := left(
    'New announcement: ' || v_title || E'\n' ||
    left(v_message, 700) ||
    E'\n\nOpen the dashboard for the full notice: ' || v_action_url,
    4096
  );

  for v_announcement in
    select p.id
    from public.profiles p
    where coalesce(p.status::text, 'pending') = 'active'
      and coalesce(p.soft_deleted, false) = false
  loop
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      action_url,
      read,
      created_at,
      updated_at
    )
    select
      v_announcement.id,
      'New announcement: ' || v_title,
      v_message,
      'announcement',
      v_action_url,
      false,
      now(),
      now()
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = v_announcement.id
        and n.type = 'announcement'
        and n.action_url = v_action_url
    );

    if found then
      v_inserted := v_inserted + 1;
    end if;

    perform public.queue_whatsapp_notification(
      v_announcement.id,
      'announcement',
      p_announcement_id,
      v_whatsapp_message,
      v_priority,
      p_announcement_id::text
    );
  end loop;

  select ur.role
  into v_actor_role
  from public.user_roles ur
  where ur.user_id = (select created_by from public.announcements where id = p_announcement_id)
  order by case ur.role::text
    when 'admin' then 1
    when 'chairperson' then 2
    when 'vice_chairman' then 3
    when 'secretary' then 4
    when 'treasurer' then 5
    else 20
  end
  limit 1;

  insert into public.admin_audit_log (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    details
  )
  select
    a.created_by,
    v_actor_role,
    'announcement_alerts_queued',
    'announcement',
    a.id,
    jsonb_build_object(
      'title', v_title,
      'priority', v_priority,
      'dashboard_notifications_created', v_inserted,
      'whatsapp_dedupe_key', p_announcement_id::text
    )
  from public.announcements a
  where a.id = p_announcement_id
    and not exists (
      select 1
      from public.admin_audit_log l
      where l.entity_type = 'announcement'
        and l.entity_id = p_announcement_id
        and l.action = 'announcement_alerts_queued'
    );

  return v_inserted;
end;
$$;

grant execute on function public.enqueue_announcement_member_alerts(uuid, text, text, text) to authenticated, service_role;

create or replace function public.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.published, false) is true then
      perform public.enqueue_announcement_member_alerts(new.id, new.title, new.content, new.priority);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.published is true and old.published is distinct from new.published then
      perform public.enqueue_announcement_member_alerts(new.id, new.title, new.content, new.priority);
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enqueue_announcement_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.published, false) is true then
      perform public.enqueue_announcement_member_alerts(new.id, new.title, new.content, new.priority);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.published is true and old.published is distinct from new.published then
      perform public.enqueue_announcement_member_alerts(new.id, new.title, new.content, new.priority);
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enqueue_announcement_notifications(
  p_announcement_id uuid,
  p_title text,
  p_message text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return public.enqueue_announcement_member_alerts(p_announcement_id, p_title, p_message, null);
end;
$$;

grant execute on function public.enqueue_announcement_notifications(uuid, text, text) to authenticated, service_role;
