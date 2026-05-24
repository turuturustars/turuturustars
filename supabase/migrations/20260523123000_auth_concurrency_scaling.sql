-- Improve auth/member concurrency by removing the global profile scan from
-- membership-number allocation and by indexing login/admin lookup fields.

create sequence if not exists public.membership_number_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 50;

do $$
declare
  next_value bigint;
begin
  select coalesce(
    max(((regexp_match(membership_number, '^TS-([0-9]+)$'))[1])::bigint),
    0
  ) + 1
  into next_value
  from public.profiles
  where membership_number ~ '^TS-[0-9]+$';

  perform setval('public.membership_number_seq'::regclass, next_value, false);
end
$$;

create or replace function public.generate_membership_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num bigint;
  candidate text;
begin
  loop
    next_num := nextval('public.membership_number_seq'::regclass);
    candidate := 'TS-' || lpad(next_num::text, 5, '0');

    exit when not exists (
      select 1
      from public.profiles p
      where p.membership_number = candidate
    );
  end loop;

  return candidate;
end;
$$;

grant execute on function public.generate_membership_number() to service_role, authenticated;
grant usage, select on sequence public.membership_number_seq to service_role, authenticated;

create index if not exists profiles_email_login_eq_idx
  on public.profiles (email)
  where email is not null;

create index if not exists profiles_id_number_admin_lookup_idx
  on public.profiles (id_number)
  where id_number is not null;

create index if not exists profiles_soft_deleted_status_idx
  on public.profiles (status)
  where coalesce(soft_deleted, false) = false;

create index if not exists profiles_joined_at_idx
  on public.profiles (joined_at)
  where coalesce(soft_deleted, false) = false;

create index if not exists contributions_status_created_amount_idx
  on public.contributions (status, created_at)
  include (amount);

create index if not exists contributions_created_at_idx
  on public.contributions (created_at);

create index if not exists contributions_member_status_created_idx
  on public.contributions (member_id, status, created_at desc)
  include (amount, due_date, contribution_type);

create index if not exists mpesa_transactions_status_created_idx
  on public.mpesa_transactions (status, created_at);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read);

create index if not exists meetings_status_scheduled_date_idx
  on public.meetings (status, scheduled_date);

create index if not exists announcements_published_idx
  on public.announcements (published);

create index if not exists meeting_minutes_status_idx
  on public.meeting_minutes (status);

create index if not exists discipline_records_status_updated_idx
  on public.discipline_records (status, updated_at);

create index if not exists welfare_cases_status_idx
  on public.welfare_cases (status);

create index if not exists welfare_cases_created_at_idx
  on public.welfare_cases (created_at);

create index if not exists private_conversations_participant_one_idx
  on public.private_conversations (participant_one);

create index if not exists private_conversations_participant_two_idx
  on public.private_conversations (participant_two);

create index if not exists private_messages_unread_conversation_idx
  on public.private_messages (conversation_id, sender_id)
  where read_at is null;

create or replace function public.get_member_dashboard_stats()
returns table (
  total_contributions numeric,
  pending_contributions bigint,
  active_welfare_cases bigint,
  unread_notifications bigint,
  pending_membership_fee_amount numeric,
  pending_membership_fee_due_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  with contribution_stats as (
    select
      coalesce(sum(amount) filter (where status = 'paid'), 0)::numeric as total_contributions,
      count(*) filter (where status = 'pending')::bigint as pending_contributions
    from public.contributions
    where member_id = v_user_id
  ),
  pending_fee as (
    select
      amount::numeric as pending_membership_fee_amount,
      due_date as pending_membership_fee_due_date
    from public.contributions
    where member_id = v_user_id
      and contribution_type = 'membership_fee'
      and status = 'pending'
    order by created_at desc nulls last
    limit 1
  )
  select
    cs.total_contributions,
    cs.pending_contributions,
    (
      select count(*)
      from public.welfare_cases
      where status = 'active'
    )::bigint as active_welfare_cases,
    (
      select count(*)
      from public.notifications
      where user_id = v_user_id
        and coalesce(read, false) = false
    )::bigint as unread_notifications,
    pf.pending_membership_fee_amount,
    pf.pending_membership_fee_due_date
  from contribution_stats cs
  left join pending_fee pf on true;
end;
$$;

grant execute on function public.get_member_dashboard_stats() to authenticated, service_role;

create or replace function public.get_reports_summary(
  p_start timestamptz default null,
  p_end timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  with member_totals as (
    select
      count(*)::bigint as total,
      count(*) filter (where status = 'active')::bigint as active,
      count(*) filter (where status = 'pending')::bigint as pending,
      count(*) filter (where status = 'dormant')::bigint as dormant,
      count(*) filter (where coalesce(is_student, false) = true)::bigint as students
    from public.profiles
    where coalesce(soft_deleted, false) = false
  ),
  period_members as (
    select count(*)::bigint as new_members
    from public.profiles
    where coalesce(soft_deleted, false) = false
      and (p_start is null or joined_at >= p_start)
      and (p_end is null or joined_at <= p_end)
  ),
  contribution_rows as (
    select amount, contribution_type, status
    from public.contributions
    where (p_start is null or created_at >= p_start)
      and (p_end is null or created_at <= p_end)
  ),
  contribution_totals as (
    select
      count(*)::bigint as total,
      count(*) filter (where status = 'paid')::bigint as paid,
      count(*) filter (where status = 'pending')::bigint as pending,
      count(*) filter (where status = 'missed')::bigint as missed,
      coalesce(sum(amount), 0)::numeric as total_amount,
      coalesce(sum(amount) filter (where status = 'paid'), 0)::numeric as paid_amount
    from contribution_rows
  ),
  contribution_by_type as (
    select coalesce(
      jsonb_object_agg(
        contribution_type,
        jsonb_build_object('count', count, 'amount', amount)
      ),
      '{}'::jsonb
    ) as by_type
    from (
      select
        coalesce(contribution_type, 'unknown') as contribution_type,
        count(*)::bigint as count,
        coalesce(sum(amount), 0)::numeric as amount
      from contribution_rows
      group by coalesce(contribution_type, 'unknown')
    ) grouped
  ),
  welfare_rows as (
    select target_amount, collected_amount, status
    from public.welfare_cases
    where (p_start is null or created_at >= p_start)
      and (p_end is null or created_at <= p_end)
  ),
  welfare_totals as (
    select
      count(*)::bigint as total_cases,
      count(*) filter (where status = 'active')::bigint as active_cases,
      count(*) filter (where status = 'closed')::bigint as closed_cases,
      coalesce(sum(coalesce(target_amount, 0)), 0)::numeric as target_amount,
      coalesce(sum(coalesce(collected_amount, 0)), 0)::numeric as collected_amount
    from welfare_rows
  )
  select jsonb_build_object(
    'members', jsonb_build_object(
      'total', mt.total,
      'active', mt.active,
      'pending', mt.pending,
      'dormant', mt.dormant,
      'students', mt.students,
      'newThisMonth', pm.new_members
    ),
    'contributions', jsonb_build_object(
      'total', ct.total,
      'paid', ct.paid,
      'pending', ct.pending,
      'missed', ct.missed,
      'totalAmount', ct.total_amount,
      'paidAmount', ct.paid_amount,
      'byType', cbt.by_type
    ),
    'welfare', jsonb_build_object(
      'totalCases', wt.total_cases,
      'activeCases', wt.active_cases,
      'closedCases', wt.closed_cases,
      'targetAmount', wt.target_amount,
      'collectedAmount', wt.collected_amount
    )
  )
  into v_result
  from member_totals mt
  cross join period_members pm
  cross join contribution_totals ct
  cross join contribution_by_type cbt
  cross join welfare_totals wt;

  return v_result;
end;
$$;

grant execute on function public.get_reports_summary(timestamptz, timestamptz) to authenticated, service_role;

create or replace function public.get_member_registry_stats()
returns table (
  total bigint,
  active bigint,
  pending bigint,
  dormant bigint
)
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

  return query
  select
    count(*)::bigint as total,
    count(*) filter (where status = 'active')::bigint as active,
    count(*) filter (where status = 'pending')::bigint as pending,
    count(*) filter (where status = 'dormant')::bigint as dormant
  from public.profiles
  where coalesce(soft_deleted, false) = false;
end;
$$;

grant execute on function public.get_member_registry_stats() to authenticated, service_role;

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
  v_inserted integer := 0;
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

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
    p_title,
    p_message,
    'announcement',
    '/dashboard/communication/announcements#' || p_announcement_id::text,
    false,
    now(),
    now()
  from public.profiles p
  where coalesce(p.soft_deleted, false) = false;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.enqueue_announcement_notifications(uuid, text, text) to authenticated, service_role;

create or replace function public.enqueue_meeting_notifications(
  p_meeting_id uuid,
  p_title text,
  p_scheduled_date timestamptz,
  p_notification_type text,
  p_venue text default null,
  p_recipient_scope text default 'all_members'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer := 0;
  v_notification_title text;
  v_notification_message text;
  v_meeting_time text := to_char(p_scheduled_date at time zone 'Africa/Nairobi', 'Dy, Mon DD YYYY HH24:MI');
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  if p_notification_type = 'cancelled' then
    v_notification_title := 'Meeting Cancelled: ' || p_title;
    v_notification_message := 'The meeting "' || p_title || '" scheduled for ' || v_meeting_time || ' has been cancelled';
  elsif p_notification_type = 'reminder' then
    v_notification_title := 'Meeting Reminder: ' || p_title;
    v_notification_message := 'Reminder: "' || p_title || '" is happening ' || v_meeting_time;
  else
    v_notification_title := 'Meeting Scheduled: ' || p_title;
    v_notification_message := 'A new meeting "' || p_title || '" has been scheduled for ' || v_meeting_time ||
      case when nullif(p_venue, '') is null then '' else ' at ' || p_venue end;
  end if;

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
    recipients.user_id,
    v_notification_title,
    v_notification_message,
    'meeting',
    '/dashboard/governance/meetings',
    false,
    now(),
    now()
  from (
    select p.id as user_id
    from public.profiles p
    where coalesce(p.soft_deleted, false) = false
      and p.status = 'active'
      and coalesce(p_recipient_scope, 'all_members') <> 'officials'

    union

    select distinct ur.user_id
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where coalesce(p.soft_deleted, false) = false
      and p.status = 'active'
      and coalesce(p_recipient_scope, 'all_members') = 'officials'
      and ur.role in (
        'admin',
        'chairperson',
        'vice_chairman',
        'secretary',
        'vice_secretary',
        'treasurer',
        'organizing_secretary'
      )
  ) recipients;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.enqueue_meeting_notifications(uuid, text, timestamptz, text, text, text) to authenticated, service_role;

create or replace function public.initialize_meeting_attendance(p_meeting_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer := 0;
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  insert into public.meeting_attendance (
    meeting_id,
    member_id,
    attended,
    marked_by
  )
  select
    p_meeting_id,
    p.id,
    false,
    v_user_id
  from public.profiles p
  where coalesce(p.soft_deleted, false) = false
    and p.status = 'active'
  on conflict (meeting_id, member_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.initialize_meeting_attendance(uuid) to authenticated, service_role;

create or replace function public.get_official_dashboard_stats()
returns table (
  total_members bigint,
  active_members bigint,
  pending_approvals bigint,
  upcoming_meetings bigint,
  published_announcements bigint,
  total_collected_amount numeric,
  collected_this_month_amount numeric,
  pending_contributions_count bigint,
  pending_contributions_amount numeric,
  missed_contributions_count bigint,
  mpesa_completed_count bigint,
  mpesa_this_month_count bigint,
  documents_count bigint,
  meeting_minutes_draft_count bigint,
  meeting_minutes_approved_count bigint,
  discipline_open_cases bigint,
  discipline_resolved_this_month bigint,
  fines_outstanding_amount numeric,
  welfare_active_cases bigint,
  unread_private_messages bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_month_start timestamptz := date_trunc('month', now());
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with contribution_stats as (
    select
      coalesce(sum(amount) filter (where lower(coalesce(status::text, '')) = 'paid'), 0)::numeric as total_collected_amount,
      coalesce(sum(amount) filter (
        where lower(coalesce(status::text, '')) = 'paid'
          and created_at >= v_month_start
      ), 0)::numeric as collected_this_month_amount,
      count(*) filter (where lower(coalesce(status::text, '')) = 'pending')::bigint as pending_contributions_count,
      coalesce(sum(amount) filter (where lower(coalesce(status::text, '')) = 'pending'), 0)::numeric as pending_contributions_amount,
      count(*) filter (where lower(coalesce(status::text, '')) = 'missed')::bigint as missed_contributions_count
    from public.contributions
  ),
  mpesa_stats as (
    select
      count(*) filter (where lower(coalesce(status, '')) in ('completed', 'success'))::bigint as mpesa_completed_count,
      count(*) filter (where created_at >= v_month_start)::bigint as mpesa_this_month_count
    from public.mpesa_transactions
  ),
  meeting_minutes_stats as (
    select
      count(*) filter (where lower(coalesce(status, '')) = 'draft')::bigint as meeting_minutes_draft_count,
      count(*) filter (where lower(coalesce(status, '')) = 'approved')::bigint as meeting_minutes_approved_count
    from public.meeting_minutes
  ),
  discipline_stats as (
    select
      count(*) filter (
        where lower(coalesce(status, '')) not in ('resolved', 'closed', 'completed', 'dismissed')
      )::bigint as discipline_open_cases,
      count(*) filter (
        where lower(coalesce(status, '')) in ('resolved', 'closed', 'completed', 'dismissed')
          and updated_at >= v_month_start
      )::bigint as discipline_resolved_this_month,
      coalesce(sum(coalesce(fine_amount, 0)) filter (where coalesce(fine_paid, false) = false), 0)::numeric as fines_outstanding_amount
    from public.discipline_records
  )
  select
    (select count(*) from public.profiles where coalesce(soft_deleted, false) = false)::bigint as total_members,
    (select count(*) from public.profiles where status = 'active' and coalesce(soft_deleted, false) = false)::bigint as active_members,
    (select count(*) from public.profiles where status = 'pending' and coalesce(soft_deleted, false) = false)::bigint as pending_approvals,
    (select count(*) from public.meetings where status = 'scheduled' and scheduled_date >= now())::bigint as upcoming_meetings,
    (select count(*) from public.announcements where published = true)::bigint as published_announcements,
    cs.total_collected_amount,
    cs.collected_this_month_amount,
    cs.pending_contributions_count,
    cs.pending_contributions_amount,
    cs.missed_contributions_count,
    ms.mpesa_completed_count,
    ms.mpesa_this_month_count,
    (select count(*) from public.documents)::bigint as documents_count,
    mms.meeting_minutes_draft_count,
    mms.meeting_minutes_approved_count,
    ds.discipline_open_cases,
    ds.discipline_resolved_this_month,
    ds.fines_outstanding_amount,
    (
      select count(*)
      from public.welfare_cases
      where lower(coalesce(status, '')) not in ('resolved', 'closed', 'completed', 'inactive')
    )::bigint as welfare_active_cases,
    (
      select count(*)
      from public.private_messages pm
      join public.private_conversations pc on pc.id = pm.conversation_id
      where pm.read_at is null
        and pm.sender_id <> v_user_id
        and (pc.participant_one = v_user_id or pc.participant_two = v_user_id)
    )::bigint as unread_private_messages
  from contribution_stats cs
  cross join mpesa_stats ms
  cross join meeting_minutes_stats mms
  cross join discipline_stats ds;
end;
$$;

grant execute on function public.get_official_dashboard_stats() to authenticated, service_role;
