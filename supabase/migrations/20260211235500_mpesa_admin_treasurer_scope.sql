-- Narrow M-Pesa finance operations to admin + treasurer only.

-- payments
drop policy if exists "Members can view own payments" on public.payments;
create policy "Members can view own payments"
  on public.payments
  for select
  to authenticated
  using (
    member_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Finance officials can create payments" on public.payments;
create policy "Finance officials can create payments"
  on public.payments
  for insert
  to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Finance officials can update payments" on public.payments;
create policy "Finance officials can update payments"
  on public.payments
  for update
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

-- till_submissions
drop policy if exists "Members can view own till submissions" on public.till_submissions;
create policy "Members can view own till submissions"
  on public.till_submissions
  for select
  to authenticated
  using (
    member_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Finance officials can update till submissions" on public.till_submissions;
create policy "Finance officials can update till submissions"
  on public.till_submissions
  for update
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

-- approvals
drop policy if exists "Members and finance officials can view approvals" on public.approvals;
create policy "Members and finance officials can view approvals"
  on public.approvals
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or exists (
      select 1
      from public.payments p
      where p.id = approvals.payment_id
      and p.member_id = (select auth.uid())
    )
  );

-- callback audit
drop policy if exists "Finance officials can view callback audit" on public.mpesa_callback_audit;
create policy "Finance officials can view callback audit"
  on public.mpesa_callback_audit
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Finance officials can write callback audit" on public.mpesa_callback_audit;
create policy "Finance officials can write callback audit"
  on public.mpesa_callback_audit
  for insert
  to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );
