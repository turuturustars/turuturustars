-- Schedule the generic background job worker so queued heavy work is processed
-- without blocking user-facing requests.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'background-jobs-worker-every-minute';
exception
  when undefined_table or undefined_function then
    null;
end;
$$;

select cron.schedule(
  'background-jobs-worker-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://mkcgkfzltohxagqvsbqk.supabase.co/functions/v1/background-job-worker',
    body := '{"limit":50}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-background-job-secret', coalesce((
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'background_jobs_worker_secret'
        limit 1
      ), '')
    ),
    timeout_milliseconds := 25000
  );
  $$
);
