-- Security policy hardening:
-- 1) prevent client-side creation of pre-verified/paid payment artifacts
-- 2) keep donation inserts in pending state only
-- 3) restrict sensitive maintenance RPC execution

-- Donations must be created as pending records only.
drop policy if exists "Public can create donations" on public.donations;
create policy "Public can create donations"
  on public.donations
  for insert
  to anon, authenticated
  with check (
    amount > 0
    and currency is not null
    and length(trim(currency)) between 3 and 5
    and coalesce(status, 'pending') = 'pending'
    and paid_at is null
  );

-- Members can only create raw pending payment rows for themselves.
drop policy if exists "Members can create own payments" on public.payments;
create policy "Members can create own payments"
  on public.payments
  for insert
  to authenticated
  with check (
    member_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
    and coalesce(status, 'pending') = 'pending'
    and verified_at is null
    and coalesce(trim(mpesa_receipt), '') = ''
    and checkout_request_id is null
    and merchant_request_id is null
  );

-- Members can only submit pending till verification requests for themselves.
drop policy if exists "Members can create own till submissions" on public.till_submissions;
create policy "Members can create own till submissions"
  on public.till_submissions
  for insert
  to authenticated
  with check (
    member_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
    and coalesce(status, 'pending') = 'pending'
    and length(trim(mpesa_receipt)) >= 5
  );

-- Prevent direct client RPC execution of cleanup maintenance function.
do $$
begin
  if to_regprocedure('public.delete_expired_jobs()') is not null then
    revoke execute on function public.delete_expired_jobs() from public, anon, authenticated;
    grant execute on function public.delete_expired_jobs() to service_role;
  end if;
end
$$;
