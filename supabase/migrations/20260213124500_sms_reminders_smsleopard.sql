-- SMS reminders via SMSLeopard:
-- - Enforce Kenyan mobile number normalization for profile phone values.
-- - Queue SMS events for welcome, successful payments, announcements, welfare, and voting.
-- - Add per-user SMS preferences and announcement-priority filtering.

alter table public.notification_preferences
  add column if not exists sms_enabled boolean not null default true,
  add column if not exists enable_sms_welcome boolean not null default true,
  add column if not exists enable_sms_announcements boolean not null default true,
  add column if not exists enable_sms_welfare boolean not null default true,
  add column if not exists enable_sms_voting boolean not null default true,
  add column if not exists enable_sms_transactions boolean not null default true,
  add column if not exists sms_announcement_priority text not null default 'high';

alter table public.notification_preferences
  drop constraint if exists notification_preferences_sms_announcement_priority_check;

alter table public.notification_preferences
  add constraint notification_preferences_sms_announcement_priority_check
  check (sms_announcement_priority in ('low', 'normal', 'high', 'urgent'));

create or replace function public.normalize_kenyan_phone(_raw_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v_trimmed text;
  v_digits text;
begin
  if _raw_phone is null then
    return null;
  end if;

  v_trimmed := btrim(_raw_phone);
  if v_trimmed = '' then
    return null;
  end if;

  v_digits := regexp_replace(v_trimmed, '\D', '', 'g');

  if v_digits ~ '^0[17][0-9]{8}$' then
    return '+254' || substring(v_digits from 2);
  end if;

  if v_digits ~ '^254[17][0-9]{8}$' then
    return '+' || v_digits;
  end if;

  return null;
end;
$$;

create or replace function public.is_valid_kenyan_phone(_raw_phone text)
returns boolean
language sql
immutable
as $$
  select public.normalize_kenyan_phone(_raw_phone) is not null;
$$;

create or replace function public.normalize_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.phone is null or btrim(new.phone) = '' then
    return new;
  end if;

  -- Preserve admin redaction values used on rejected/suspended accounts.
  if new.phone ~* '^REJECTED-' then
    return new;
  end if;

  new.phone := public.normalize_kenyan_phone(new.phone);
  if new.phone is null then
    raise exception
      'Invalid Kenyan mobile number. Use 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +2547XXXXXXXX, or +2541XXXXXXXX.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_profile_phone on public.profiles;
create trigger trg_normalize_profile_phone
before insert or update of phone on public.profiles
for each row
execute function public.normalize_profile_phone();

update public.profiles
set phone = public.normalize_kenyan_phone(phone)
where phone is not null
  and btrim(phone) <> ''
  and phone !~* '^REJECTED-'
  and public.normalize_kenyan_phone(phone) is not null
  and phone is distinct from public.normalize_kenyan_phone(phone);

create table if not exists public.sms_notifications_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('welcome', 'payment_success', 'announcement', 'welfare', 'voting')),
  event_id uuid,
  phone text not null,
  message text not null check (char_length(btrim(message)) > 0 and char_length(message) <= 480),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  provider_response jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists sms_notifications_queue_user_event_uniq
  on public.sms_notifications_queue (user_id, event_type, event_id);

create index if not exists sms_notifications_queue_status_created_at_idx
  on public.sms_notifications_queue (status, created_at asc);

create index if not exists sms_notifications_queue_user_created_at_idx
  on public.sms_notifications_queue (user_id, created_at desc);

alter table public.sms_notifications_queue enable row level security;

drop policy if exists "Officials can view sms notification queue" on public.sms_notifications_queue;
create policy "Officials can view sms notification queue"
  on public.sms_notifications_queue
  for select
  to authenticated
  using (public.is_official((select auth.uid())));

drop trigger if exists update_sms_notifications_queue_updated_at on public.sms_notifications_queue;
create trigger update_sms_notifications_queue_updated_at
before update on public.sms_notifications_queue
for each row
execute function public.update_updated_at();

create or replace function public.sms_priority_rank(_priority text)
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

create or replace function public.queue_sms_notification(
  _user_id uuid,
  _event_type text,
  _event_id uuid,
  _message text,
  _priority text default 'normal'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_sms_enabled boolean;
  v_sms_welcome boolean;
  v_sms_announcements boolean;
  v_sms_welfare boolean;
  v_sms_voting boolean;
  v_sms_transactions boolean;
  v_sms_announcement_priority text;
  v_priority text := lower(coalesce(_priority, 'normal'));
  v_allowed boolean := false;
begin
  if _user_id is null then
    return;
  end if;

  if coalesce(length(trim(_message)), 0) = 0 then
    return;
  end if;

  select public.normalize_kenyan_phone(p.phone)
  into v_phone
  from public.profiles p
  where p.id = _user_id;

  if v_phone is null then
    return;
  end if;

  select
    np.sms_enabled,
    np.enable_sms_welcome,
    np.enable_sms_announcements,
    np.enable_sms_welfare,
    np.enable_sms_voting,
    np.enable_sms_transactions,
    np.sms_announcement_priority
  into
    v_sms_enabled,
    v_sms_welcome,
    v_sms_announcements,
    v_sms_welfare,
    v_sms_voting,
    v_sms_transactions,
    v_sms_announcement_priority
  from public.notification_preferences np
  where np.user_id = _user_id;

  v_sms_enabled := coalesce(v_sms_enabled, true);
  v_sms_welcome := coalesce(v_sms_welcome, true);
  v_sms_announcements := coalesce(v_sms_announcements, true);
  v_sms_welfare := coalesce(v_sms_welfare, true);
  v_sms_voting := coalesce(v_sms_voting, true);
  v_sms_transactions := coalesce(v_sms_transactions, true);
  v_sms_announcement_priority := coalesce(v_sms_announcement_priority, 'high');

  if not v_sms_enabled then
    return;
  end if;

  case _event_type
    when 'welcome' then
      v_allowed := v_sms_welcome;
    when 'payment_success' then
      v_allowed := v_sms_transactions;
    when 'announcement' then
      v_allowed := v_sms_announcements
        and public.sms_priority_rank(v_priority) >= public.sms_priority_rank(v_sms_announcement_priority);
    when 'welfare' then
      v_allowed := v_sms_welfare;
    when 'voting' then
      v_allowed := v_sms_voting;
    else
      v_allowed := false;
  end case;

  if not v_allowed then
    return;
  end if;

  insert into public.sms_notifications_queue (
    user_id,
    event_type,
    event_id,
    phone,
    message,
    priority,
    status
  )
  values (
    _user_id,
    _event_type,
    _event_id,
    v_phone,
    left(trim(_message), 480),
    v_priority,
    'pending'
  )
  on conflict (user_id, event_type, event_id) do nothing;
end;
$$;

create or replace function public.enqueue_welcome_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.queue_sms_notification(
    new.id,
    'welcome',
    new.id,
    'Welcome to Turuturu Stars. Your account is ready. Complete your profile to keep receiving important updates.',
    'normal'
  );

  return new;
end;
$$;

drop trigger if exists trg_enqueue_welcome_sms on public.profiles;
create trigger trg_enqueue_welcome_sms
after insert on public.profiles
for each row
execute function public.enqueue_welcome_sms();

create or replace function public.enqueue_payment_success_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount text;
  v_message text;
begin
  if new.member_id is null then
    return new;
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    v_amount := trim(to_char(new.amount, 'FM999999999990D00'));
    v_message := 'Payment received: KES ' || v_amount || '. Thank you for your contribution.';

    if new.mpesa_receipt is not null and btrim(new.mpesa_receipt) <> '' then
      v_message := v_message || ' Ref: ' || new.mpesa_receipt || '.';
    end if;

    perform public.queue_sms_notification(
      new.member_id,
      'payment_success',
      new.id,
      v_message,
      'high'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_payment_success_sms on public.payments;
create trigger trg_enqueue_payment_success_sms
after insert or update of status on public.payments
for each row
execute function public.enqueue_payment_success_sms();

create or replace function public.enqueue_announcement_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.published, false) is not true then
      return new;
    end if;
  elsif tg_op = 'UPDATE' then
    if not (new.published is true and (old.published is distinct from new.published)) then
      return new;
    end if;
  else
    return new;
  end if;

  for v_member in
    select p.id
    from public.profiles p
    where coalesce(p.status::text, 'pending') in ('active', 'pending')
  loop
    perform public.queue_sms_notification(
      v_member.id,
      'announcement',
      new.id,
      'New announcement: ' || new.title || '. Open your dashboard for details.',
      coalesce(new.priority, 'normal')
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_announcement_sms_insert on public.announcements;
create trigger trg_enqueue_announcement_sms_insert
after insert on public.announcements
for each row
execute function public.enqueue_announcement_sms();

drop trigger if exists trg_enqueue_announcement_sms_update on public.announcements;
create trigger trg_enqueue_announcement_sms_update
after update of published on public.announcements
for each row
execute function public.enqueue_announcement_sms();

create or replace function public.enqueue_welfare_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  for v_member in
    select p.id
    from public.profiles p
    where coalesce(p.status::text, 'pending') in ('active', 'pending')
  loop
    perform public.queue_sms_notification(
      v_member.id,
      'welfare',
      new.id,
      'New welfare case: ' || new.title || '. Open your dashboard for details.',
      'high'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_welfare_sms on public.welfare_cases;
create trigger trg_enqueue_welfare_sms
after insert on public.welfare_cases
for each row
execute function public.enqueue_welfare_sms();

create or replace function public.notify_voting_motion_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id,
    title,
    message,
    type,
    read,
    action_url,
    created_at,
    updated_at
  )
  select
    p.id,
    'New Voting Motion',
    new.title,
    'system',
    false,
    '/dashboard/governance/voting#' || new.id,
    now(),
    now()
  from public.profiles p
  where coalesce(p.status::text, 'pending') in ('active', 'pending');

  return new;
end;
$$;

drop trigger if exists trg_notify_voting_motion_created on public.voting_motions;
create trigger trg_notify_voting_motion_created
after insert on public.voting_motions
for each row
execute function public.notify_voting_motion_created();

create or replace function public.enqueue_voting_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  for v_member in
    select p.id
    from public.profiles p
    where coalesce(p.status::text, 'pending') in ('active', 'pending')
  loop
    perform public.queue_sms_notification(
      v_member.id,
      'voting',
      new.id,
      'New voting motion: ' || new.title || '. Please cast your vote from the dashboard.',
      'high'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_voting_sms on public.voting_motions;
create trigger trg_enqueue_voting_sms
after insert on public.voting_motions
for each row
execute function public.enqueue_voting_sms();

