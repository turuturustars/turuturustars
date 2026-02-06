# Jobs Maintenance

## Daily cleanup (expired jobs)
Schedule this SQL to run daily (e.g., 00:30 Africa/Nairobi):

```
select public.delete_expired_jobs();
```

If pg_cron is enabled you can run:

```
select
  cron.schedule(
    'delete-expired-jobs',
    '30 0 * * *',
    $$select public.delete_expired_jobs();$$
  );
```

## Ingestion (basic script)
The basic scraper script inserts pending listings that need moderation:

```
JOBS_INGEST_URL=https://<project>.supabase.co/functions/v1/jobs-ingest
JOBS_INGEST_KEY=your-ingest-secret
node scripts/jobs/scrape-basic.mjs
```

To limit sources:

```
JOB_SOURCES="MyGov Job Adverts,Public Service Commission,Murang'a County Government" \
node scripts/jobs/scrape-basic.mjs
```

Note: Pending listings must be approved in the admin dashboard before they appear publicly.
