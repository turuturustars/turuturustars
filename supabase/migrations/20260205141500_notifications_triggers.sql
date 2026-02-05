-- Notifications triggers for welcome + contribution activity

-- Welcome notification on new profile creation
create or replace function public.notify_welcome()
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
  values (
    new.id,
    'Welcome to Turuturu Stars',
    'Your account is ready. Complete your profile and explore your dashboard.',
    'system',
    false,
    '/dashboard',
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_welcome on public.profiles;
create trigger trg_notify_welcome
after insert on public.profiles
for each row
execute function public.notify_welcome();

-- Contribution notifications on insert/update
create or replace function public.notify_contribution_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  msg text;
  title text;
  url text := '/dashboard/finance/contributions';
begin
  if tg_op = 'INSERT' then
    title := 'Contribution Recorded';
    msg := 'Your contribution of KES ' || new.amount || ' has been recorded.';
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      title := 'Contribution Status Updated';
      msg := 'Your contribution is now marked as ' || new.status || '.';
    else
      return new;
    end if;
  else
    return new;
  end if;

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
  values (
    new.member_id,
    title,
    msg,
    'contribution',
    false,
    url,
    now(),
    now()
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_contribution_insert on public.contributions;
create trigger trg_notify_contribution_insert
after insert on public.contributions
for each row
execute function public.notify_contribution_change();

drop trigger if exists trg_notify_contribution_update on public.contributions;
create trigger trg_notify_contribution_update
after update on public.contributions
for each row
execute function public.notify_contribution_change();
