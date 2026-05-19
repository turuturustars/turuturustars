-- Queue WhatsApp alerts for treasurers whenever money moves outside the M-Pesa
-- callback path. M-Pesa/STK Edge Functions send immediate treasurer WhatsApp
-- alerts; these triggers cover wallet, kitty, refund, expenditure, and welfare
-- ledger events that may be created directly from dashboard/RPC workflows.

create or replace function public.queue_treasurer_money_whatsapp_alert(
  _event_id uuid,
  _source_table text,
  _title text,
  _message text,
  _dedupe_key text default null,
  _priority text default 'urgent'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
  v_phone text;
  v_dedupe_key text;
  v_inserted integer := 0;
  v_total integer := 0;
  v_priority text := lower(coalesce(_priority, 'urgent'));
begin
  if coalesce(length(btrim(_message)), 0) = 0 then
    return 0;
  end if;

  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'urgent';
  end if;

  v_dedupe_key := coalesce(
    nullif(btrim(_dedupe_key), ''),
    coalesce(_source_table, 'money') || ':' || coalesce(_event_id::text, gen_random_uuid()::text)
  );

  for v_recipient in
    select distinct p.id, p.phone
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role::text = 'treasurer'
      and p.phone is not null
      and btrim(p.phone) <> ''
  loop
    v_phone := public.normalize_kenyan_phone(v_recipient.phone);
    if v_phone is null then
      continue;
    end if;

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
      v_recipient.id,
      'notification',
      _event_id,
      'treasurer-money:' || v_dedupe_key,
      v_phone,
      left(btrim(_message), 4096),
      v_priority,
      'pending'
    )
    on conflict (user_id, event_type, dedupe_key) do nothing;

    get diagnostics v_inserted = row_count;
    v_total := v_total + v_inserted;
  end loop;

  return v_total;
end;
$$;

grant execute on function public.queue_treasurer_money_whatsapp_alert(uuid, text, text, text, text, text)
  to authenticated, service_role;

create or replace function public.enqueue_treasurer_wallet_transaction_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_name text;
  v_member_number text;
  v_member_phone text;
  v_amount text := trim(to_char(new.amount, 'FM999999999990D00'));
  v_message text;
begin
  if new.status is distinct from 'completed' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;
  end if;

  -- M-Pesa top-ups and kitty wallet contributions have richer alerts from the
  -- payment callback or kitty contribution ledger. Avoid double WhatsApps.
  if new.mpesa_transaction_id is not null or new.type = 'kitty_contribution' then
    return new;
  end if;

  select p.full_name, p.membership_number, p.phone
  into v_member_name, v_member_number, v_member_phone
  from public.profiles p
  where p.id = new.user_id;

  v_message := 'Treasury alert' || chr(10) ||
    'Wallet transaction completed' || chr(10) ||
    'Type: ' || coalesce(new.type, 'wallet') || chr(10) ||
    'Direction: ' || coalesce(new.direction, 'n/a') || chr(10) ||
    'Amount: KES ' || v_amount || chr(10) ||
    'Member: ' || coalesce(v_member_name, 'Unknown member') ||
      case when v_member_number is not null then ' - ' || v_member_number else '' end || chr(10) ||
    'Phone: ' || coalesce(v_member_phone, 'n/a') || chr(10) ||
    'Reference: ' || coalesce(new.reference, new.id::text) || chr(10) ||
    'Balance after: KES ' || trim(to_char(coalesce(new.balance_after, 0), 'FM999999999990D00'));

  perform public.queue_treasurer_money_whatsapp_alert(
    new.id,
    'wallet_transactions',
    'Wallet transaction completed',
    v_message,
    'wallet_transactions:' || new.id::text || ':' || new.status,
    'urgent'
  );

  return new;
end;
$$;

drop trigger if exists trg_treasurer_wallet_transaction_alert on public.wallet_transactions;
create trigger trg_treasurer_wallet_transaction_alert
after insert or update of status on public.wallet_transactions
for each row
execute function public.enqueue_treasurer_wallet_transaction_alert();

create or replace function public.enqueue_treasurer_kitty_contribution_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_name text;
  v_member_number text;
  v_member_phone text;
  v_kitty_title text;
  v_amount text := trim(to_char(new.amount, 'FM999999999990D00'));
  v_message text;
begin
  if new.status is distinct from 'completed' then
    return new;
  end if;

  if new.source::text = 'mpesa' then
    return new;
  end if;

  -- The WhatsApp bot sends this one immediately after the RPC succeeds.
  if coalesce(new.notes, '') ilike 'WhatsApp kitty contribution%' then
    return new;
  end if;

  select p.full_name, p.membership_number, p.phone
  into v_member_name, v_member_number, v_member_phone
  from public.profiles p
  where p.id = new.member_id;

  select k.title
  into v_kitty_title
  from public.kitties k
  where k.id = new.kitty_id;

  v_message := 'Treasury alert' || chr(10) ||
    'Kitty contribution completed' || chr(10) ||
    'Kitty: ' || coalesce(v_kitty_title, new.kitty_id::text) || chr(10) ||
    'Source: ' || new.source::text || chr(10) ||
    'Amount: KES ' || v_amount || chr(10) ||
    'Member: ' || coalesce(v_member_name, 'Unknown member') ||
      case when v_member_number is not null then ' - ' || v_member_number else '' end || chr(10) ||
    'Phone: ' || coalesce(v_member_phone, 'n/a') || chr(10) ||
    'Reference: ' || coalesce(new.reference, new.id::text);

  perform public.queue_treasurer_money_whatsapp_alert(
    new.id,
    'kitty_contributions',
    'Kitty contribution completed',
    v_message,
    'kitty_contributions:' || new.id::text || ':' || new.status,
    'urgent'
  );

  return new;
end;
$$;

drop trigger if exists trg_treasurer_kitty_contribution_alert on public.kitty_contributions;
create trigger trg_treasurer_kitty_contribution_alert
after insert on public.kitty_contributions
for each row
execute function public.enqueue_treasurer_kitty_contribution_alert();

create or replace function public.enqueue_treasurer_kitty_disbursement_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kitty_title text;
  v_recorder_name text;
  v_amount text := trim(to_char(new.amount, 'FM999999999990D00'));
  v_message text;
begin
  select k.title
  into v_kitty_title
  from public.kitties k
  where k.id = new.kitty_id;

  select p.full_name
  into v_recorder_name
  from public.profiles p
  where p.id = new.recorded_by;

  v_message := 'Treasury alert' || chr(10) ||
    'Kitty disbursement recorded' || chr(10) ||
    'Kitty: ' || coalesce(v_kitty_title, new.kitty_id::text) || chr(10) ||
    'Amount: KES ' || v_amount || chr(10) ||
    'Recipient: ' || coalesce(new.recipient, 'n/a') || chr(10) ||
    'Purpose: ' || new.purpose || chr(10) ||
    'Recorded by: ' || coalesce(v_recorder_name, new.recorded_by::text) || chr(10) ||
    'Reference: ' || coalesce(new.reference, new.id::text);

  perform public.queue_treasurer_money_whatsapp_alert(
    new.id,
    'kitty_disbursements',
    'Kitty disbursement recorded',
    v_message,
    'kitty_disbursements:' || new.id::text,
    'urgent'
  );

  return new;
end;
$$;

drop trigger if exists trg_treasurer_kitty_disbursement_alert on public.kitty_disbursements;
create trigger trg_treasurer_kitty_disbursement_alert
after insert on public.kitty_disbursements
for each row
execute function public.enqueue_treasurer_kitty_disbursement_alert();

create or replace function public.enqueue_treasurer_expenditure_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_initiator_name text;
  v_amount text := trim(to_char(new.amount, 'FM999999999990D00'));
  v_message text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;
  end if;

  select p.full_name
  into v_initiator_name
  from public.profiles p
  where p.id = new.initiated_by;

  v_message := 'Treasury alert' || chr(10) ||
    'Expenditure ' || coalesce(new.status, 'recorded') || chr(10) ||
    'Category: ' || new.category || chr(10) ||
    'Amount: KES ' || v_amount || chr(10) ||
    'Method: ' || coalesce(new.payment_method, 'manual') || chr(10) ||
    'Initiated by: ' || coalesce(v_initiator_name, new.initiated_by::text) || chr(10) ||
    'Details: ' || new.description;

  perform public.queue_treasurer_money_whatsapp_alert(
    new.id,
    'expenditures',
    'Expenditure updated',
    v_message,
    'expenditures:' || new.id::text || ':' || new.status,
    'urgent'
  );

  return new;
end;
$$;

drop trigger if exists trg_treasurer_expenditure_alert on public.expenditures;
create trigger trg_treasurer_expenditure_alert
after insert or update of status on public.expenditures
for each row
execute function public.enqueue_treasurer_expenditure_alert();

create or replace function public.enqueue_treasurer_refund_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_name text;
  v_member_number text;
  v_member_phone text;
  v_amount text := trim(to_char(new.payout_amount, 'FM999999999990D00'));
  v_message text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;
  end if;

  select p.full_name, p.membership_number, p.phone
  into v_member_name, v_member_number, v_member_phone
  from public.profiles p
  where p.id = new.member_id;

  v_message := 'Treasury alert' || chr(10) ||
    'Refund request ' || new.status || chr(10) ||
    'Type: ' || new.contribution_type || chr(10) ||
    'Requested: KES ' || trim(to_char(new.requested_amount, 'FM999999999990D00')) || chr(10) ||
    'Payout: KES ' || v_amount || chr(10) ||
    'Member: ' || coalesce(v_member_name, 'Unknown member') ||
      case when v_member_number is not null then ' - ' || v_member_number else '' end || chr(10) ||
    'Phone: ' || coalesce(v_member_phone, 'n/a') || chr(10) ||
    'Reason: ' || coalesce(new.reason, 'n/a');

  perform public.queue_treasurer_money_whatsapp_alert(
    new.id,
    'refund_requests',
    'Refund request updated',
    v_message,
    'refund_requests:' || new.id::text || ':' || new.status,
    'urgent'
  );

  return new;
end;
$$;

drop trigger if exists trg_treasurer_refund_alert on public.refund_requests;
create trigger trg_treasurer_refund_alert
after insert or update of status on public.refund_requests
for each row
execute function public.enqueue_treasurer_refund_alert();

create or replace function public.enqueue_treasurer_welfare_transaction_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_title text;
  v_recorder_name text;
  v_amount text := trim(to_char(new.amount, 'FM999999999990D00'));
  v_message text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;
  end if;

  select wc.title
  into v_case_title
  from public.welfare_cases wc
  where wc.id = new.welfare_case_id;

  select p.full_name
  into v_recorder_name
  from public.profiles p
  where p.id = new.recorded_by_id;

  v_message := 'Treasury alert' || chr(10) ||
    'Welfare transaction ' || new.status || chr(10) ||
    'Case: ' || coalesce(v_case_title, new.welfare_case_id::text) || chr(10) ||
    'Type: ' || new.transaction_type || chr(10) ||
    'Amount: KES ' || v_amount || chr(10) ||
    'Recorded by: ' || coalesce(v_recorder_name, new.recorded_by_id::text) || chr(10) ||
    'M-Pesa code: ' || coalesce(new.mpesa_code, 'n/a') || chr(10) ||
    'Notes: ' || coalesce(new.notes, 'n/a');

  perform public.queue_treasurer_money_whatsapp_alert(
    new.id,
    'welfare_transactions',
    'Welfare transaction recorded',
    v_message,
    'welfare_transactions:' || new.id::text || ':' || new.status,
    'urgent'
  );

  return new;
end;
$$;

drop trigger if exists trg_treasurer_welfare_transaction_alert on public.welfare_transactions;
create trigger trg_treasurer_welfare_transaction_alert
after insert or update of status on public.welfare_transactions
for each row
execute function public.enqueue_treasurer_welfare_transaction_alert();

create or replace function public.enqueue_treasurer_pesapal_transaction_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_name text;
  v_member_number text;
  v_member_phone text;
  v_amount text := trim(to_char(new.amount, 'FM999999999990D00'));
  v_message text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;
  end if;

  select p.full_name, p.membership_number, p.phone
  into v_member_name, v_member_number, v_member_phone
  from public.profiles p
  where p.id = new.member_id;

  v_message := 'Treasury alert' || chr(10) ||
    'Pesapal transaction ' || coalesce(new.status, 'recorded') || chr(10) ||
    'Amount: ' || coalesce(new.currency, 'KES') || ' ' || v_amount || chr(10) ||
    'Member: ' || coalesce(v_member_name, 'Public/donation') ||
      case when v_member_number is not null then ' - ' || v_member_number else '' end || chr(10) ||
    'Phone/account: ' || coalesce(v_member_phone, new.payment_account, 'n/a') || chr(10) ||
    'Reference: ' || coalesce(new.confirmation_code, new.order_tracking_id, new.merchant_reference, new.id::text) || chr(10) ||
    'Description: ' || coalesce(new.description, 'n/a');

  perform public.queue_treasurer_money_whatsapp_alert(
    new.id,
    'pesapal_transactions',
    'Pesapal transaction updated',
    v_message,
    'pesapal_transactions:' || new.id::text || ':' || new.status,
    'urgent'
  );

  return new;
end;
$$;

drop trigger if exists trg_treasurer_pesapal_transaction_alert on public.pesapal_transactions;
create trigger trg_treasurer_pesapal_transaction_alert
after insert or update of status on public.pesapal_transactions
for each row
execute function public.enqueue_treasurer_pesapal_transaction_alert();
