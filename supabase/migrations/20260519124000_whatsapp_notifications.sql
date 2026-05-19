-- WhatsApp outbound notifications:
-- - Queue eligible WhatsApp messages for payments, welfare cases, meetings, and reminders.
-- - Respect notification preferences and meeting audience scope.
-- - Keep actual provider delivery in the whatsapp-notifications Edge Function.

alter table public.notification_preferences
  add column if not exists whatsapp boolean not null default true;

alter table public.meetings
  add column if not exists recipient_scope text not null default 'all_members';

alter table public.meetings
  drop constraint if exists meetings_recipient_scope_check;

alter table public.meetings
  add constraint meetings_recipient_scope_check
  check (recipient_scope in ('all_members', 'officials'));

update public.meetings
set recipient_scope = case
  when meeting_type = 'management_committee' then 'officials'
  else 'all_members'
end
where recipient_scope not in ('all_members', 'officials');

update public.meetings
set recipient_scope = 'officials'
where meeting_type = 'management_committee'
  and recipient_scope = 'all_members';

create table if not exists public.whatsapp_notifications_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'welcome',
      'payment_success',
      'announcement',
      'welfare',
      'meeting_scheduled',
      'meeting_cancelled',
      'meeting_reminder',
      'membership_fee_reminder',
      'notification'
    )
  ),
  event_id uuid,
  dedupe_key text not null default gen_random_uuid()::text,
  phone text not null,
  message text not null check (char_length(btrim(message)) > 0 and char_length(message) <= 4096),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  provider_response jsonb,
  whatsapp_message_id uuid references public.whatsapp_messages(id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists whatsapp_notifications_queue_user_event_dedupe_uniq
  on public.whatsapp_notifications_queue (user_id, event_type, dedupe_key);

create index if not exists whatsapp_notifications_queue_status_created_at_idx
  on public.whatsapp_notifications_queue (status, created_at asc);

create index if not exists whatsapp_notifications_queue_user_created_at_idx
  on public.whatsapp_notifications_queue (user_id, created_at desc);

alter table public.whatsapp_notifications_queue enable row level security;

drop policy if exists "Officials can view whatsapp notification queue" on public.whatsapp_notifications_queue;
create policy "Officials can view whatsapp notification queue"
  on public.whatsapp_notifications_queue
  for select
  to authenticated
  using (public.is_official((select auth.uid())));

drop trigger if exists update_whatsapp_notifications_queue_updated_at on public.whatsapp_notifications_queue;
create trigger update_whatsapp_notifications_queue_updated_at
before update on public.whatsapp_notifications_queue
for each row
execute function public.update_updated_at();

revoke all on public.whatsapp_notifications_queue from anon;
grant select on public.whatsapp_notifications_queue to authenticated;

create or replace function public.whatsapp_priority_rank(_priority text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(_priority, 'normal'))
    when 'low' then 1
    when 'normal' then 2
    when 'high' then 3
    when 'urgent' then 4
    else 2
  end;
$$;

create or replace function public.queue_whatsapp_notification(
  _user_id uuid,
  _event_type text,
  _event_id uuid,
  _message text,
  _priority text default 'normal',
  _dedupe_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_whatsapp boolean;
  v_announcements boolean;
  v_contributions boolean;
  v_welfare boolean;
  v_meetings boolean;
  v_transactions boolean;
  v_priority text := lower(coalesce(_priority, 'normal'));
  v_dedupe_key text;
  v_allowed boolean := false;
begin
  if _user_id is null then
    return false;
  end if;

  if coalesce(length(trim(_message)), 0) = 0 then
    return false;
  end if;

  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'normal';
  end if;

  select public.normalize_kenyan_phone(p.phone)
  into v_phone
  from public.profiles p
  where p.id = _user_id;

  if v_phone is null then
    return false;
  end if;

  select
    np.whatsapp,
    np.enable_announcements,
    np.enable_contributions,
    np.enable_welfare,
    np.enable_meetings,
    np.enable_transactions
  into
    v_whatsapp,
    v_announcements,
    v_contributions,
    v_welfare,
    v_meetings,
    v_transactions
  from public.notification_preferences np
  where np.user_id = _user_id;

  v_whatsapp := coalesce(v_whatsapp, true);
  v_announcements := coalesce(v_announcements, true);
  v_contributions := coalesce(v_contributions, true);
  v_welfare := coalesce(v_welfare, true);
  v_meetings := coalesce(v_meetings, true);
  v_transactions := coalesce(v_transactions, true);

  if not v_whatsapp then
    return false;
  end if;

  case _event_type
    when 'welcome' then
      v_allowed := true;
    when 'payment_success' then
      v_allowed := v_transactions or v_contributions;
    when 'announcement' then
      v_allowed := v_announcements;
    when 'welfare' then
      v_allowed := v_welfare;
    when 'meeting_scheduled' then
      v_allowed := v_meetings;
    when 'meeting_cancelled' then
      v_allowed := v_meetings;
    when 'meeting_reminder' then
      v_allowed := v_meetings;
    when 'membership_fee_reminder' then
      v_allowed := v_contributions or v_transactions;
    when 'notification' then
      v_allowed := true;
    else
      v_allowed := false;
  end case;

  if not v_allowed then
    return false;
  end if;

  v_dedupe_key := coalesce(nullif(btrim(_dedupe_key), ''), _event_id::text, gen_random_uuid()::text);

  insert into public.whatsapp_notifications_queue (
    user_id,
    event_type,
    event_id,
    dedupe_key,
    phone,
    message,
    priority,
    status
  )
  values (
    _user_id,
    _event_type,
    _event_id,
    v_dedupe_key,
    v_phone,
    left(trim(_message), 4096),
    v_priority,
    'pending'
  )
  on conflict (user_id, event_type, dedupe_key) do nothing;

  return true;
end;
$$;

create or replace function public.whatsapp_notification_type_enabled(
  _user_id uuid,
  _notification_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := lower(coalesce(_notification_type, 'system'));
  v_whatsapp boolean;
  v_announcements boolean;
  v_contributions boolean;
  v_welfare boolean;
  v_meetings boolean;
  v_transactions boolean;
  v_approvals boolean;
  v_messages boolean;
begin
  select
    np.whatsapp,
    np.enable_announcements,
    np.enable_contributions,
    np.enable_welfare,
    np.enable_meetings,
    np.enable_transactions,
    np.enable_approvals,
    np.enable_messages
  into
    v_whatsapp,
    v_announcements,
    v_contributions,
    v_welfare,
    v_meetings,
    v_transactions,
    v_approvals,
    v_messages
  from public.notification_preferences np
  where np.user_id = _user_id;

  if coalesce(v_whatsapp, true) is not true then
    return false;
  end if;

  case v_type
    when 'announcement' then
      return coalesce(v_announcements, true);
    when 'contribution' then
      return coalesce(v_contributions, true);
    when 'contribution_reminder' then
      return coalesce(v_contributions, true);
    when 'membership_fee' then
      return coalesce(v_contributions, true);
    when 'welfare' then
      return coalesce(v_welfare, true);
    when 'welfare_case' then
      return coalesce(v_welfare, true);
    when 'meeting' then
      return coalesce(v_meetings, true);
    when 'transaction' then
      return coalesce(v_transactions, true);
    when 'payment' then
      return coalesce(v_transactions, true);
    when 'wallet_topup' then
      return coalesce(v_transactions, true);
    when 'kitty_contribution' then
      return coalesce(v_transactions, true);
    when 'approval' then
      return coalesce(v_approvals, true);
    when 'private_message' then
      return coalesce(v_messages, true);
    when 'message' then
      return coalesce(v_messages, true);
    else
      return true;
  end case;
end;
$$;

create or replace function public.enqueue_generic_notification_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := lower(coalesce(new.type, 'system'));
  v_message text;
  v_priority text := 'normal';
begin
  if new.user_id is null then
    return new;
  end if;

  -- These have dedicated WhatsApp triggers because they need exact audience
  -- handling, reminder timing, or payment-specific wording.
  if v_type in ('announcement', 'meeting', 'welfare', 'transaction') then
    return new;
  end if;

  if public.whatsapp_notification_type_enabled(new.user_id, new.type) is not true then
    return new;
  end if;

  v_message := left(
    btrim(coalesce(nullif(new.title, ''), 'Notification') || ': ' || coalesce(new.message, '')),
    4096
  );

  if v_type in ('system', 'approval', 'voting', 'vote', 'election') then
    v_priority := 'high';
  end if;

  perform public.queue_whatsapp_notification(
    new.user_id,
    'notification',
    new.id,
    v_message,
    v_priority,
    'notification:' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_enqueue_generic_notification_whatsapp on public.notifications;
create trigger trg_enqueue_generic_notification_whatsapp
after insert on public.notifications
for each row
execute function public.enqueue_generic_notification_whatsapp();

create or replace function public.whatsapp_meeting_recipient_ids(
  _meeting_type text,
  _recipient_scope text default null
)
returns table(user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with resolved_scope as (
    select coalesce(
      nullif(_recipient_scope, ''),
      case when _meeting_type = 'management_committee' then 'officials' else 'all_members' end
    ) as value
  )
  select p.id
  from public.profiles p
  cross join resolved_scope rs
  where coalesce(p.status::text, 'pending') = 'active'
    and (
      rs.value = 'all_members'
      or public.is_official(p.id)
    );
$$;

create or replace function public.enqueue_payment_success_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount text;
  v_message text;
begin
  if new.member_id is null or new.status is distinct from 'completed' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  v_amount := trim(to_char(new.amount, 'FM999999999990D00'));
  v_message := 'Payment received: KES ' || v_amount || '. Thank you for your contribution.';

  if new.mpesa_receipt is not null and btrim(new.mpesa_receipt) <> '' then
    v_message := v_message || ' Ref: ' || new.mpesa_receipt || '.';
  end if;

  perform public.queue_whatsapp_notification(
    new.member_id,
    'payment_success',
    new.id,
    v_message,
    'high'
  );

  return new;
end;
$$;

drop trigger if exists trg_enqueue_payment_success_whatsapp on public.payments;
create trigger trg_enqueue_payment_success_whatsapp
after insert or update of status on public.payments
for each row
execute function public.enqueue_payment_success_whatsapp();

create or replace function public.enqueue_mpesa_transaction_success_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount text;
  v_reference text;
  v_message text;
begin
  if new.member_id is null or new.status is distinct from 'completed' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  v_amount := trim(to_char(new.amount, 'FM999999999990D00'));
  v_reference := coalesce(new.mpesa_receipt_number, new.checkout_request_id, new.id::text);
  v_message := 'Payment received: KES ' || v_amount || '. Thank you for your contribution. Ref: ' || v_reference || '.';

  perform public.queue_whatsapp_notification(
    new.member_id,
    'payment_success',
    new.id,
    v_message,
    'high'
  );

  return new;
end;
$$;

drop trigger if exists trg_enqueue_mpesa_transaction_success_whatsapp on public.mpesa_transactions;
create trigger trg_enqueue_mpesa_transaction_success_whatsapp
after insert or update of status on public.mpesa_transactions
for each row
execute function public.enqueue_mpesa_transaction_success_whatsapp();

create or replace function public.enqueue_announcement_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_title text := coalesce(nullif(btrim(new.title), ''), 'announcement');
  v_message text;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.published, false) is not true then
      return new;
    end if;
  elsif tg_op = 'UPDATE' then
    if not (new.published is true and old.published is distinct from new.published) then
      return new;
    end if;
  else
    return new;
  end if;

  v_message := 'New announcement: ' || v_title || '. Open your dashboard for details.';

  for v_member in
    select p.id
    from public.profiles p
    where coalesce(p.status::text, 'pending') = 'active'
  loop
    perform public.queue_whatsapp_notification(
      v_member.id,
      'announcement',
      new.id,
      v_message,
      coalesce(new.priority, 'normal')
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_announcement_whatsapp_insert on public.announcements;
create trigger trg_enqueue_announcement_whatsapp_insert
after insert on public.announcements
for each row
execute function public.enqueue_announcement_whatsapp();

drop trigger if exists trg_enqueue_announcement_whatsapp_update on public.announcements;
create trigger trg_enqueue_announcement_whatsapp_update
after update of published on public.announcements
for each row
execute function public.enqueue_announcement_whatsapp();

create or replace function public.enqueue_welfare_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_title text := coalesce(nullif(btrim(new.title), ''), 'welfare case');
  v_message text;
begin
  v_message := 'New welfare case: ' || v_title || '. Open your dashboard for details.';

  for v_member in
    select p.id
    from public.profiles p
    where coalesce(p.status::text, 'pending') = 'active'
  loop
    perform public.queue_whatsapp_notification(
      v_member.id,
      'welfare',
      new.id,
      v_message,
      'high'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_welfare_whatsapp on public.welfare_cases;
create trigger trg_enqueue_welfare_whatsapp
after insert on public.welfare_cases
for each row
execute function public.enqueue_welfare_whatsapp();

create or replace function public.enqueue_meeting_scheduled_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
  v_time text;
  v_message text;
begin
  if coalesce(new.status, 'scheduled') = 'cancelled' then
    return new;
  end if;

  v_time := to_char(new.scheduled_date at time zone 'Africa/Nairobi', 'Dy, DD Mon YYYY HH24:MI') || ' EAT';
  v_message := 'New meeting: ' || new.title || ' on ' || v_time;

  if new.venue is not null and btrim(new.venue) <> '' then
    v_message := v_message || ' at ' || new.venue;
  end if;

  v_message := v_message || '.';

  for v_recipient in
    select user_id
    from public.whatsapp_meeting_recipient_ids(new.meeting_type, new.recipient_scope)
  loop
    perform public.queue_whatsapp_notification(
      v_recipient.user_id,
      'meeting_scheduled',
      new.id,
      v_message,
      'high',
      'meeting:' || new.id::text || ':scheduled:' || new.scheduled_date::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_meeting_scheduled_whatsapp on public.meetings;
create trigger trg_enqueue_meeting_scheduled_whatsapp
after insert on public.meetings
for each row
execute function public.enqueue_meeting_scheduled_whatsapp();

create or replace function public.enqueue_meeting_cancelled_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
  v_time text;
  v_message text;
begin
  if new.status is distinct from 'cancelled' or old.status is not distinct from new.status then
    return new;
  end if;

  v_time := to_char(new.scheduled_date at time zone 'Africa/Nairobi', 'Dy, DD Mon YYYY HH24:MI') || ' EAT';
  v_message := 'Meeting cancelled: ' || new.title || ' scheduled for ' || v_time || '.';

  for v_recipient in
    select user_id
    from public.whatsapp_meeting_recipient_ids(new.meeting_type, new.recipient_scope)
  loop
    perform public.queue_whatsapp_notification(
      v_recipient.user_id,
      'meeting_cancelled',
      new.id,
      v_message,
      'urgent',
      'meeting:' || new.id::text || ':cancelled:' || new.scheduled_date::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_meeting_cancelled_whatsapp on public.meetings;
create trigger trg_enqueue_meeting_cancelled_whatsapp
after update of status on public.meetings
for each row
execute function public.enqueue_meeting_cancelled_whatsapp();

create or replace function public.queue_meeting_whatsapp_reminders(
  _hours_before integer default 24,
  _window_minutes integer default 60
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours integer := greatest(0, coalesce(_hours_before, 24));
  v_window integer := greatest(1, coalesce(_window_minutes, 60));
  v_from timestamptz;
  v_until timestamptz;
  v_meeting record;
  v_recipient record;
  v_time text;
  v_message text;
  v_count integer := 0;
begin
  v_from := now() + make_interval(hours => v_hours);
  v_until := v_from + make_interval(mins => v_window);

  for v_meeting in
    select id, title, meeting_type, recipient_scope, scheduled_date, venue
    from public.meetings
    where status = 'scheduled'
      and scheduled_date >= v_from
      and scheduled_date < v_until
  loop
    v_time := to_char(v_meeting.scheduled_date at time zone 'Africa/Nairobi', 'Dy, DD Mon YYYY HH24:MI') || ' EAT';
    v_message := 'Meeting reminder: ' || v_meeting.title || ' is on ' || v_time;

    if v_meeting.venue is not null and btrim(v_meeting.venue) <> '' then
      v_message := v_message || ' at ' || v_meeting.venue;
    end if;

    v_message := v_message || '.';

    for v_recipient in
      select user_id
      from public.whatsapp_meeting_recipient_ids(v_meeting.meeting_type, v_meeting.recipient_scope)
    loop
      if public.queue_whatsapp_notification(
        v_recipient.user_id,
        'meeting_reminder',
        v_meeting.id,
        v_message,
        'high',
        'meeting:' || v_meeting.id::text || ':reminder:' || v_hours::text || ':' || v_meeting.scheduled_date::text
      ) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  return v_count;
end;
$$;

create or replace function public.queue_membership_fee_whatsapp_reminders(_days_before integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(0, coalesce(_days_before, 14));
  v_fee record;
  v_amount text;
  v_due_date text;
  v_message text;
  v_count integer := 0;
begin
  for v_fee in
    select
      p.id as user_id,
      coalesce(f.id, p.id) as event_id,
      coalesce(f.due_date, p.next_membership_renewal_date::date) as due_date,
      coalesce(f.amount, p.membership_fee_amount, 200) as amount
    from public.profiles p
    left join lateral (
      select c.id, c.due_date, c.amount
      from public.contributions c
      where c.member_id = p.id
        and c.contribution_type = 'membership_fee'
        and c.status = 'pending'
        and c.due_date between current_date and (current_date + v_days)
      order by c.due_date asc
      limit 1
    ) f on true
    where coalesce(p.status::text, 'pending') = 'active'
      and (
        f.id is not null
        or p.next_membership_renewal_date::date between current_date and (current_date + v_days)
      )
  loop
    v_amount := trim(to_char(v_fee.amount, 'FM999999999990D00'));
    v_due_date := to_char(v_fee.due_date, 'DD Mon YYYY');
    v_message := 'Membership fee reminder: KES ' || v_amount ||
      ' is due by ' || v_due_date ||
      '. Please renew before it expires.';

    if public.queue_whatsapp_notification(
      v_fee.user_id,
      'membership_fee_reminder',
      v_fee.event_id,
      v_message,
      'high',
      'membership_fee:' || v_fee.user_id::text || ':' || v_fee.due_date::text
    ) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in (
    'whatsapp-meeting-reminders-hourly',
    'whatsapp-membership-fee-reminders-daily'
  );
exception
  when undefined_table or undefined_function then
    null;
end;
$$;

select cron.schedule(
  'whatsapp-meeting-reminders-hourly',
  '0 * * * *',
  $$select public.queue_meeting_whatsapp_reminders(24, 60);$$
);

select cron.schedule(
  'whatsapp-membership-fee-reminders-daily',
  '0 8 * * *',
  $$select public.queue_membership_fee_whatsapp_reminders(14);$$
);
