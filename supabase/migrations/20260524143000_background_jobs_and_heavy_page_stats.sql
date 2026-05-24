-- Generic background jobs and aggregate RPCs for high-concurrency pages.
-- Heavy user actions should enqueue work and let scheduled workers process it.

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (length(btrim(job_type)) between 3 and 80),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority integer not null default 5 check (priority between 1 and 10),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 25),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  result_payload jsonb,
  completed_at timestamptz,
  dedupe_key text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists background_jobs_queue_idx
  on public.background_jobs (status, priority, run_after, created_at);

create index if not exists background_jobs_type_created_idx
  on public.background_jobs (job_type, created_at desc);

create index if not exists background_jobs_created_by_idx
  on public.background_jobs (created_by, created_at desc)
  where created_by is not null;

create unique index if not exists background_jobs_active_dedupe_idx
  on public.background_jobs (job_type, dedupe_key)
  where dedupe_key is not null and status in ('queued', 'running');

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_action_type_created_at_idx
  on public.audit_logs (action_type, created_at desc);

create index if not exists audit_logs_performed_by_created_at_idx
  on public.audit_logs (performed_by, created_at desc);

create index if not exists mpesa_transactions_created_at_idx
  on public.mpesa_transactions (created_at desc);

create index if not exists private_conversations_participant_one_updated_idx
  on public.private_conversations (participant_one, updated_at desc);

create index if not exists private_conversations_participant_two_updated_idx
  on public.private_conversations (participant_two, updated_at desc);

create index if not exists private_messages_conversation_created_idx
  on public.private_messages (conversation_id, created_at desc);

create index if not exists user_status_user_seen_idx
  on public.user_status (user_id, last_seen desc);

alter table public.background_jobs enable row level security;

drop policy if exists "Users can view own background jobs" on public.background_jobs;
create policy "Users can view own background jobs"
  on public.background_jobs
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_official((select auth.uid()))
  );

drop policy if exists "Service role can manage background jobs" on public.background_jobs;
create policy "Service role can manage background jobs"
  on public.background_jobs
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.background_jobs to authenticated;
grant all on public.background_jobs to service_role;

create or replace function public.touch_background_jobs_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_background_jobs_updated_at on public.background_jobs;
create trigger trg_background_jobs_updated_at
before update on public.background_jobs
for each row
execute function public.touch_background_jobs_updated_at();

create or replace function public.enqueue_background_job(
  p_job_type text,
  p_payload jsonb default '{}'::jsonb,
  p_priority integer default 5,
  p_run_after timestamptz default now(),
  p_dedupe_key text default null,
  p_max_attempts integer default 5
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_job_id uuid;
  v_official_job_types text[] := array[
    'notification_single',
    'notification_bulk',
    'announcement_notifications',
    'meeting_notifications',
    'sms_bulk',
    'whatsapp_bulk',
    'email_bulk',
    'reminder_batch',
    'bulk_import',
    'admin_report_export',
    'report_export',
    'audit_log_export',
    'announcement_export',
    'member_export',
    'welfare_export',
    'accounting_export',
    'payments_export',
    'payment_reconciliation',
    'mpesa_status_recheck',
    'mpesa_url_registration'
  ];
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  p_job_type := lower(btrim(p_job_type));
  if p_job_type = '' then
    raise exception 'Job type is required' using errcode = '22023';
  end if;

  if p_job_type = any(v_official_job_types)
     and not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  if p_dedupe_key is not null then
    select id
    into v_existing_id
    from public.background_jobs
    where job_type = p_job_type
      and dedupe_key = p_dedupe_key
      and status in ('queued', 'running')
    order by created_at desc
    limit 1;

    if v_existing_id is not null then
      return v_existing_id;
    end if;
  end if;

  insert into public.background_jobs (
    job_type,
    payload,
    priority,
    run_after,
    dedupe_key,
    max_attempts,
    created_by
  )
  values (
    p_job_type,
    coalesce(p_payload, '{}'::jsonb),
    least(greatest(coalesce(p_priority, 5), 1), 10),
    coalesce(p_run_after, now()),
    nullif(btrim(coalesce(p_dedupe_key, '')), ''),
    least(greatest(coalesce(p_max_attempts, 5), 1), 25),
    v_user_id
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

grant execute on function public.enqueue_background_job(text, jsonb, integer, timestamptz, text, integer)
  to authenticated, service_role;

create or replace function public.claim_background_jobs(
  p_worker text,
  p_limit integer default 25
)
returns setof public.background_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  return query
  with next_jobs as (
    select id
    from public.background_jobs
    where status = 'queued'
      and run_after <= now()
    order by priority asc, created_at asc
    for update skip locked
    limit v_limit
  ),
  claimed as (
    update public.background_jobs jobs
    set
      status = 'running',
      attempts = jobs.attempts + 1,
      locked_at = now(),
      locked_by = nullif(btrim(coalesce(p_worker, 'worker')), ''),
      last_error = null
    from next_jobs
    where jobs.id = next_jobs.id
    returning jobs.*
  )
  select * from claimed;
end;
$$;

grant execute on function public.claim_background_jobs(text, integer) to service_role;

create or replace function public.complete_background_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  update public.background_jobs
  set
    status = 'completed',
    locked_at = null,
    locked_by = null,
    last_error = null,
    completed_at = now()
  where id = p_job_id
    and status = 'running';

  return found;
end;
$$;

grant execute on function public.complete_background_job(uuid) to service_role;

create or replace function public.complete_background_job(
  p_job_id uuid,
  p_result_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  update public.background_jobs
  set
    status = 'completed',
    locked_at = null,
    locked_by = null,
    last_error = null,
    result_payload = coalesce(p_result_payload, '{}'::jsonb),
    completed_at = now()
  where id = p_job_id
    and status = 'running';

  return found;
end;
$$;

grant execute on function public.complete_background_job(uuid, jsonb) to service_role;

create or replace function public.fail_background_job(
  p_job_id uuid,
  p_error text,
  p_retry_seconds integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retry_seconds integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select coalesce(
    p_retry_seconds,
    least(3600, greatest(30, (power(2, least(attempts, 8)) * 30)::integer))
  )
  into v_retry_seconds
  from public.background_jobs
  where id = p_job_id;

  update public.background_jobs
  set
    status = case when attempts >= max_attempts then 'failed' else 'queued' end,
    run_after = case when attempts >= max_attempts then run_after else now() + make_interval(secs => v_retry_seconds) end,
    locked_at = null,
    locked_by = null,
    last_error = left(coalesce(p_error, 'Background job failed'), 2000)
  where id = p_job_id
    and status = 'running';

  return found;
end;
$$;

grant execute on function public.fail_background_job(uuid, text, integer) to service_role;

create or replace function public.get_mpesa_management_stats()
returns table (
  completed_amount numeric,
  pending_amount numeric,
  total_transactions bigint,
  completed_count bigint,
  pending_count bigint,
  failed_count bigint,
  success_rate numeric
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
    coalesce(sum(amount) filter (where lower(coalesce(status, '')) in ('completed', 'success')), 0)::numeric as completed_amount,
    coalesce(sum(amount) filter (where lower(coalesce(status, '')) = 'pending'), 0)::numeric as pending_amount,
    count(*)::bigint as total_transactions,
    count(*) filter (where lower(coalesce(status, '')) in ('completed', 'success'))::bigint as completed_count,
    count(*) filter (where lower(coalesce(status, '')) = 'pending')::bigint as pending_count,
    count(*) filter (where lower(coalesce(status, '')) in ('failed', 'cancelled'))::bigint as failed_count,
    case
      when count(*) = 0 then 0::numeric
      else round(
        (count(*) filter (where lower(coalesce(status, '')) in ('completed', 'success'))::numeric / count(*)::numeric) * 100,
        2
      )
    end as success_rate
  from public.mpesa_transactions;
end;
$$;

grant execute on function public.get_mpesa_management_stats() to authenticated, service_role;

create or replace function public.get_payment_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now());
  v_week_start timestamptz := now() - interval '7 days';
  v_result jsonb;
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  with today_rows as (
    select amount, status
    from public.mpesa_transactions
    where created_at >= v_today_start
  ),
  week_rows as (
    select amount, status, created_at
    from public.mpesa_transactions
    where created_at >= v_week_start
  ),
  today_stats as (
    select
      coalesce(sum(amount) filter (where status = 'completed'), 0)::numeric as today_total,
      count(*) filter (where status = 'completed')::bigint as today_count,
      count(*)::numeric as today_all_count
    from today_rows
  ),
  week_stats as (
    select
      coalesce(sum(amount) filter (where status = 'completed'), 0)::numeric as weekly_total,
      count(*) filter (where status = 'completed')::bigint as weekly_count,
      count(*) filter (where status = 'pending')::bigint as pending_count,
      count(*) filter (where status = 'failed')::bigint as failed_count,
      count(*)::numeric as weekly_all_count,
      coalesce(avg(amount), 0)::numeric as average_amount,
      coalesce(avg(extract(epoch from (now() - created_at))) filter (where status = 'completed'), 0)::numeric as average_processing_time
    from week_rows
  )
  select jsonb_build_object(
    'todayTotal', ts.today_total,
    'todayCount', ts.today_count,
    'todaySuccessRate', case when ts.today_all_count = 0 then 0 else (ts.today_count::numeric / ts.today_all_count) * 100 end,
    'weeklyTotal', ws.weekly_total,
    'weeklyCount', ws.weekly_count,
    'averageAmount', ws.average_amount,
    'pendingCount', ws.pending_count,
    'failedCount', ws.failed_count,
    'averageProcessingTime', ws.average_processing_time
  )
  into v_result
  from today_stats ts
  cross join week_stats ws;

  return v_result;
end;
$$;

grant execute on function public.get_payment_metrics() to authenticated, service_role;

create or replace function public.get_finance_approval_stats()
returns table (
  completed_amount numeric,
  failed_count bigint,
  awaiting_amount numeric,
  awaiting_count bigint,
  expenditure_amount numeric,
  expenditure_count bigint,
  refund_amount numeric,
  refund_count bigint,
  total_queue_amount numeric,
  total_queue_count bigint
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
  with payment_stats as (
    select
      coalesce(sum(amount) filter (where status = 'completed'), 0)::numeric as completed_amount,
      count(*) filter (where status = 'failed')::bigint as failed_count,
      coalesce(sum(amount) filter (where status = 'awaiting_approval'), 0)::numeric as awaiting_amount,
      count(*) filter (where status = 'awaiting_approval')::bigint as awaiting_count
    from public.payments
  ),
  expenditure_stats as (
    select
      coalesce(sum(amount), 0)::numeric as expenditure_amount,
      count(*)::bigint as expenditure_count
    from public.expenditures
    where status = 'pending_approval'
  ),
  refund_stats as (
    select
      coalesce(sum(payout_amount), 0)::numeric as refund_amount,
      count(*)::bigint as refund_count
    from public.refund_requests
    where status = 'pending_approval'
  )
  select
    ps.completed_amount,
    ps.failed_count,
    ps.awaiting_amount,
    ps.awaiting_count,
    es.expenditure_amount,
    es.expenditure_count,
    rs.refund_amount,
    rs.refund_count,
    (ps.awaiting_amount + es.expenditure_amount + rs.refund_amount)::numeric as total_queue_amount,
    (ps.awaiting_count + es.expenditure_count + rs.refund_count)::bigint as total_queue_count
  from payment_stats ps
  cross join expenditure_stats es
  cross join refund_stats rs;
end;
$$;

grant execute on function public.get_finance_approval_stats() to authenticated, service_role;

create or replace function public.get_accounting_suite_summary(p_period text default 'year')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_period text := lower(coalesce(nullif(btrim(p_period), ''), 'year'));
  v_start timestamptz;
  v_result jsonb;
begin
  if v_user_id is null or not public.is_official(v_user_id) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  v_start := case v_period
    when 'month' then date_trunc('month', now())
    when 'quarter' then date_trunc('month', now()) - interval '2 months'
    when 'year' then date_trunc('month', now()) - interval '11 months'
    else null
  end;

  with contribution_stats as (
    select
      coalesce(sum(amount) filter (
        where status = 'paid'
          and (v_start is null or coalesce(paid_at::timestamptz, created_at) >= v_start)
      ), 0)::numeric as contribution_income,
      coalesce(sum(amount) filter (where status = 'pending'), 0)::numeric as receivables,
      count(*) filter (
        where status = 'paid'
          and (v_start is null or coalesce(paid_at::timestamptz, created_at) >= v_start)
      )::bigint as paid_contribution_count
    from public.contributions
  ),
  payment_stats as (
    select
      coalesce(sum(amount) filter (
        where status = 'completed'
          and (v_start is null or coalesce(verified_at, created_at) >= v_start)
      ), 0)::numeric as direct_payment_income,
      coalesce(sum(amount) filter (where status = 'awaiting_approval'), 0)::numeric as mpesa_clearing,
      count(*) filter (
        where status = 'completed'
          and (v_start is null or coalesce(verified_at, created_at) >= v_start)
      )::bigint as completed_payment_count,
      count(*) filter (where status = 'awaiting_approval')::bigint as awaiting_payment_count
    from public.payments
  ),
  expenditure_stats as (
    select
      coalesce(sum(amount) filter (
        where status = 'approved'
          and (v_start is null or coalesce(expense_date::timestamptz, created_at) >= v_start)
      ), 0)::numeric as operating_expenses,
      coalesce(sum(amount) filter (where status = 'pending_approval'), 0)::numeric as payables,
      count(*)::bigint as total_expenditure_count,
      count(*) filter (where status = 'pending_approval')::bigint as pending_expenditure_count,
      count(*) filter (
        where account_code is null
          or lower(coalesce(category, '')) like '%other%'
      )::bigint as unclassified_expense_count,
      count(*) filter (
        where nullif(btrim(coalesce(reference_number, '')), '') is null
          and status <> 'rejected'
      )::bigint as missing_reference_count
    from public.expenditures
  ),
  refund_stats as (
    select
      coalesce(sum(payout_amount) filter (
        where status = 'paid'
          and (v_start is null or coalesce(resolved_at, created_at) >= v_start)
      ), 0)::numeric as refund_expense,
      coalesce(sum(payout_amount) filter (where status = 'approved'), 0)::numeric as refund_payables
    from public.refund_requests
  ),
  kitty_stats as (
    select
      coalesce(sum(total_contributed), 0)::numeric as kitty_income
    from public.kitties
  ),
  kitty_disbursement_stats as (
    select
      coalesce(sum(amount) filter (
        where v_start is null or created_at >= v_start
      ), 0)::numeric as kitty_outflows
    from public.kitty_disbursements
  ),
  wallet_stats as (
    select
      coalesce(sum(balance) filter (where coalesce(status, 'active') <> 'closed'), 0)::numeric as member_wallet_liability
    from public.wallets
  ),
  expense_categories as (
    select coalesce(
      jsonb_agg(jsonb_build_object('name', category, 'value', amount) order by amount desc),
      '[]'::jsonb
    ) as rows
    from (
      select
        coalesce(nullif(btrim(category), ''), 'Unclassified') as category,
        coalesce(sum(amount), 0)::numeric as amount
      from public.expenditures
      where status = 'approved'
        and (v_start is null or coalesce(expense_date::timestamptz, created_at) >= v_start)
      group by coalesce(nullif(btrim(category), ''), 'Unclassified')
      having coalesce(sum(amount), 0) > 0
      order by amount desc
      limit 12
    ) grouped
  ),
  month_buckets as (
    select generate_series(
      date_trunc('month', now()) - interval '5 months',
      date_trunc('month', now()),
      interval '1 month'
    ) as month_start
  ),
  monthly_income as (
    select date_trunc('month', event_date) as month_start, sum(amount)::numeric as amount
    from (
      select coalesce(paid_at::timestamptz, created_at) as event_date, amount
      from public.contributions
      where status = 'paid'
        and coalesce(paid_at::timestamptz, created_at) >= date_trunc('month', now()) - interval '5 months'
      union all
      select coalesce(verified_at, created_at) as event_date, amount
      from public.payments
      where status = 'completed'
        and coalesce(verified_at, created_at) >= date_trunc('month', now()) - interval '5 months'
    ) rows
    group by date_trunc('month', event_date)
  ),
  monthly_expenses as (
    select date_trunc('month', event_date) as month_start, sum(amount)::numeric as amount
    from (
      select coalesce(expense_date::timestamptz, created_at) as event_date, amount
      from public.expenditures
      where status = 'approved'
        and coalesce(expense_date::timestamptz, created_at) >= date_trunc('month', now()) - interval '5 months'
      union all
      select coalesce(resolved_at, created_at) as event_date, payout_amount as amount
      from public.refund_requests
      where status = 'paid'
        and coalesce(resolved_at, created_at) >= date_trunc('month', now()) - interval '5 months'
      union all
      select created_at as event_date, amount
      from public.kitty_disbursements
      where created_at >= date_trunc('month', now()) - interval '5 months'
    ) rows
    group by date_trunc('month', event_date)
  ),
  monthly_trend as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key', to_char(mb.month_start, 'YYYY-MM'),
          'month', to_char(mb.month_start, 'Mon'),
          'income', coalesce(mi.amount, 0),
          'expenses', coalesce(me.amount, 0)
        )
        order by mb.month_start
      ),
      '[]'::jsonb
    ) as rows
    from month_buckets mb
    left join monthly_income mi on mi.month_start = mb.month_start
    left join monthly_expenses me on me.month_start = mb.month_start
  ),
  totals as (
    select
      cs.contribution_income,
      ps.direct_payment_income,
      ks.kitty_income,
      (cs.contribution_income + ps.direct_payment_income + ks.kitty_income)::numeric as income,
      es.operating_expenses,
      rs.refund_expense,
      kds.kitty_outflows,
      (es.operating_expenses + rs.refund_expense + kds.kitty_outflows)::numeric as total_expenses,
      cs.receivables,
      ps.mpesa_clearing,
      ws.member_wallet_liability,
      es.payables,
      rs.refund_payables,
      cs.paid_contribution_count,
      ps.completed_payment_count,
      ps.awaiting_payment_count,
      es.pending_expenditure_count,
      es.total_expenditure_count,
      es.unclassified_expense_count,
      es.missing_reference_count
    from contribution_stats cs
    cross join payment_stats ps
    cross join expenditure_stats es
    cross join refund_stats rs
    cross join kitty_stats ks
    cross join kitty_disbursement_stats kds
    cross join wallet_stats ws
  )
  select jsonb_build_object(
    'contributionIncome', t.contribution_income,
    'directPaymentIncome', t.direct_payment_income,
    'kittyIncome', t.kitty_income,
    'income', t.income,
    'operatingExpenses', t.operating_expenses,
    'refundExpense', t.refund_expense,
    'kittyOutflows', t.kitty_outflows,
    'totalExpenses', t.total_expenses,
    'surplus', t.income - t.total_expenses,
    'cashAndBank', t.income - t.total_expenses,
    'receivables', t.receivables,
    'mpesaClearing', t.mpesa_clearing,
    'memberWalletLiability', t.member_wallet_liability,
    'payables', t.payables,
    'refundPayables', t.refund_payables,
    'totalAssets', (t.income - t.total_expenses) + t.receivables + t.mpesa_clearing,
    'totalLiabilities', t.member_wallet_liability + t.payables + t.refund_payables,
    'fundBalance', ((t.income - t.total_expenses) + t.receivables + t.mpesa_clearing) - (t.member_wallet_liability + t.payables + t.refund_payables),
    'paidContributionCount', t.paid_contribution_count,
    'completedPaymentCount', t.completed_payment_count,
    'awaitingPaymentCount', t.awaiting_payment_count,
    'pendingExpenditureCount', t.pending_expenditure_count,
    'totalExpenditureCount', t.total_expenditure_count,
    'unclassifiedExpenseCount', t.unclassified_expense_count,
    'missingReferenceCount', t.missing_reference_count,
    'expensesByCategory', ec.rows,
    'monthlyTrend', mt.rows
  )
  into v_result
  from totals t
  cross join expense_categories ec
  cross join monthly_trend mt;

  return v_result;
end;
$$;

grant execute on function public.get_accounting_suite_summary(text) to authenticated, service_role;
