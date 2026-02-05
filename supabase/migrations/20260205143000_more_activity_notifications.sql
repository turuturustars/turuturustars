-- More activity-driven notifications (announcements, meetings, welfare, approvals)

-- Announcement published -> notify all members
create or replace function public.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.published is true then
      insert into public.notifications (
        user_id, title, message, type, read, action_url, created_at, updated_at
      )
      select
        p.id,
        'New Announcement',
        new.title,
        'announcement',
        false,
        '/dashboard/communication/announcements#' || new.id,
        now(),
        now()
      from public.profiles p;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.published is true and (old.published is distinct from new.published) then
      insert into public.notifications (
        user_id, title, message, type, read, action_url, created_at, updated_at
      )
      select
        p.id,
        'New Announcement',
        new.title,
        'announcement',
        false,
        '/dashboard/communication/announcements#' || new.id,
        now(),
        now()
      from public.profiles p;
    end if;
  end if;
  return new;
end;
$$;

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

-- Meetings -> notify all members on schedule and cancellation
create or replace function public.notify_meeting_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  title_text text;
  msg_text text;
begin
  if tg_op = 'INSERT' then
    title_text := 'Meeting Scheduled';
    msg_text := new.title || ' scheduled on ' || to_char(new.scheduled_date, 'Mon DD, YYYY HH24:MI');
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.status = 'cancelled' then
      title_text := 'Meeting Cancelled';
      msg_text := new.title || ' has been cancelled.';
    else
      return new;
    end if;
  else
    return new;
  end if;

  insert into public.notifications (
    user_id, title, message, type, read, action_url, created_at, updated_at
  )
  select
    p.id,
    title_text,
    msg_text,
    'meeting',
    false,
    '/dashboard/governance/meetings',
    now(),
    now()
  from public.profiles p;

  return new;
end;
$$;

drop trigger if exists trg_notify_meeting_insert on public.meetings;
create trigger trg_notify_meeting_insert
after insert on public.meetings
for each row
execute function public.notify_meeting_change();

drop trigger if exists trg_notify_meeting_update on public.meetings;
create trigger trg_notify_meeting_update
after update on public.meetings
for each row
execute function public.notify_meeting_change();

-- Welfare cases -> notify all members on create and status change
create or replace function public.notify_welfare_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  title_text text;
  msg_text text;
begin
  if tg_op = 'INSERT' then
    title_text := 'Welfare Case Created';
    msg_text := new.title || ' has been created.';
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      title_text := 'Welfare Case Update';
      msg_text := new.title || ' status is now ' || new.status || '.';
    else
      return new;
    end if;
  else
    return new;
  end if;

  insert into public.notifications (
    user_id, title, message, type, read, action_url, created_at, updated_at
  )
  select
    p.id,
    title_text,
    msg_text,
    'welfare',
    false,
    '/dashboard/members/welfare',
    now(),
    now()
  from public.profiles p;

  return new;
end;
$$;

drop trigger if exists trg_notify_welfare_insert on public.welfare_cases;
create trigger trg_notify_welfare_insert
after insert on public.welfare_cases
for each row
execute function public.notify_welfare_change();

drop trigger if exists trg_notify_welfare_update on public.welfare_cases;
create trigger trg_notify_welfare_update
after update on public.welfare_cases
for each row
execute function public.notify_welfare_change();

-- Profile approval -> notify the user when status becomes active
create or replace function public.notify_profile_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status = 'active' then
    insert into public.notifications (
      user_id, title, message, type, read, action_url, created_at, updated_at
    )
    values (
      new.id,
      'Membership Approved',
      'Your membership has been approved. Welcome aboard!',
      'approval',
      false,
      '/dashboard',
      now(),
      now()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_profile_status on public.profiles;
create trigger trg_notify_profile_status
after update on public.profiles
for each row
execute function public.notify_profile_status();
