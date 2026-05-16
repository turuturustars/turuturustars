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
The basic scraper script inserts approved listings by default so they appear on the public jobs page automatically:

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

To spread scraping across a 3-day sequence, set `SOURCE_SEQUENCE_DAYS=3`.
If `SOURCE_SEQUENCE_DAY` is omitted, the script picks the current UTC day in the sequence:

```
SOURCE_SEQUENCE_DAYS=3 node scripts/jobs/scrape-basic.mjs
```

To replay a specific slice manually, pass `SOURCE_SEQUENCE_DAY` from `1` to `3`:

```
SOURCE_SEQUENCE_DAYS=3 SOURCE_SEQUENCE_DAY=2 node scripts/jobs/scrape-basic.mjs
```

Note: Admin-deleted jobs are kept as rejected records so future scrapes do not post the same unwanted source URL again.

## Scheduled scrape
The GitHub Actions scrape calls the `jobs-scrape` Supabase function daily with `sequence_days: 3`.
That means each run processes one deterministic slice of the active source list, then the next slice runs the following day.
