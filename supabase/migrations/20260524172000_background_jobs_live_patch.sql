-- Live patch for the background queue after the original migration version was recorded.
-- This keeps production compatible with the new worker and queued UI actions.

alter table public.background_jobs
  add column if not exists result_payload jsonb,
  add column if not exists completed_at timestamptz;

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
