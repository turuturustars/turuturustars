-- Make announcement WhatsApp delivery explicit and auditable.
-- Published announcements must create dashboard notifications and WhatsApp
-- queue rows for active members with valid WhatsApp-capable phone numbers.

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
  v_dashboard_inserted integer := 0;
  v_whatsapp_inserted integer := 0;
  v_eligible_members integer := 0;
begin
  select id, title, content, priority, published, created_by
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
    p.id,
    'New announcement: ' || v_title,
    v_message,
    'announcement',
    v_action_url,
    false,
    now(),
    now()
  from public.profiles p
  where coalesce(p.status::text, 'pending') = 'active'
    and coalesce(p.soft_deleted, false) = false
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = p.id
        and n.type = 'announcement'
        and n.action_url = v_action_url
    );

  get diagnostics v_dashboard_inserted = row_count;

  select count(*)
  into v_eligible_members
  from public.profiles p
  where coalesce(p.status::text, 'pending') = 'active'
    and coalesce(p.soft_deleted, false) = false
    and public.normalize_kenyan_phone(p.phone) is not null;

  insert into public.whatsapp_notifications_queue (
    user_id,
    event_type,
    event_id,
    dedupe_key,
    phone,
    message,
    priority,
    status,
    created_at,
    updated_at
  )
  select
    p.id,
    'announcement',
    p_announcement_id,
    p_announcement_id::text,
    public.normalize_kenyan_phone(p.phone),
    v_whatsapp_message,
    v_priority,
    'pending',
    now(),
    now()
  from public.profiles p
  where coalesce(p.status::text, 'pending') = 'active'
    and coalesce(p.soft_deleted, false) = false
    and public.normalize_kenyan_phone(p.phone) is not null
  on conflict (user_id, event_type, dedupe_key) do nothing;

  get diagnostics v_whatsapp_inserted = row_count;

  select ur.role
  into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_announcement.created_by
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
    v_announcement.created_by,
    v_actor_role,
    'announcement_alerts_queued',
    'announcement',
    p_announcement_id,
    jsonb_build_object(
      'title', v_title,
      'priority', v_priority,
      'dashboard_notifications_created', v_dashboard_inserted,
      'whatsapp_queue_rows_created', v_whatsapp_inserted,
      'whatsapp_eligible_members', v_eligible_members,
      'whatsapp_dedupe_key', p_announcement_id::text
    )
  where not exists (
    select 1
    from public.admin_audit_log l
    where l.entity_type = 'announcement'
      and l.entity_id = p_announcement_id
      and l.action = 'announcement_alerts_queued'
  );

  return v_whatsapp_inserted;
end;
$$;

grant execute on function public.enqueue_announcement_member_alerts(uuid, text, text, text) to authenticated, service_role;

drop trigger if exists trg_notify_announcement_insert on public.announcements;
create trigger trg_notify_announcement_insert
after insert on public.announcements
for each row
execute function public.notify_announcement_published();

drop trigger if exists trg_notify_announcement_update on public.announcements;
create trigger trg_notify_announcement_update
after update on public.announcements
for each row
execute function public.notify_announcement_published();
