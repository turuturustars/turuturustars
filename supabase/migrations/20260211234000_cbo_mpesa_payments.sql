-- CBO M-Pesa contribution payments workflow
-- Creates STK/Till payment records, till verification submissions, approval records,
-- and callback audit storage with RLS + immutability controls.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references auth.users(id),
  phone text not null,
  amount numeric not null check (amount > 0),
  method text not null check (method in ('stk', 'till')),
  checkout_request_id text,
  merchant_request_id text,
  mpesa_receipt text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'awaiting_approval')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.till_submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references auth.users(id),
  phone text not null,
  amount numeric not null check (amount > 0),
  mpesa_receipt text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  approver uuid not null references auth.users(id),
  decision text not null check (decision in ('approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.mpesa_callback_audit (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  checkout_request_id text,
  merchant_request_id text,
  mpesa_receipt text,
  result_code integer,
  signature_valid boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Replay and reconciliation guards.
create unique index if not exists payments_checkout_request_id_uniq
  on public.payments (checkout_request_id)
  where checkout_request_id is not null;

create unique index if not exists payments_mpesa_receipt_uniq
  on public.payments (mpesa_receipt)
  where mpesa_receipt is not null;

create unique index if not exists till_submissions_mpesa_receipt_uniq
  on public.till_submissions (mpesa_receipt);

create unique index if not exists approvals_payment_id_uniq
  on public.approvals (payment_id);

create index if not exists payments_member_id_created_at_idx
  on public.payments (member_id, created_at desc);

create index if not exists payments_status_created_at_idx
  on public.payments (status, created_at desc);

create index if not exists till_submissions_status_created_at_idx
  on public.till_submissions (status, created_at desc);

create index if not exists mpesa_callback_audit_receipt_idx
  on public.mpesa_callback_audit (mpesa_receipt, created_at desc);

create index if not exists mpesa_callback_audit_checkout_idx
  on public.mpesa_callback_audit (checkout_request_id, created_at desc);

alter table public.payments enable row level security;
alter table public.till_submissions enable row level security;
alter table public.approvals enable row level security;
alter table public.mpesa_callback_audit enable row level security;

-- Payments policies.
drop policy if exists "Members can view own payments" on public.payments;
create policy "Members can view own payments"
  on public.payments
  for select
  to authenticated
  using (
    member_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  );

drop policy if exists "Members can create own payments" on public.payments;
create policy "Members can create own payments"
  on public.payments
  for insert
  to authenticated
  with check (member_id = (select auth.uid()));

drop policy if exists "Finance officials can create payments" on public.payments;
create policy "Finance officials can create payments"
  on public.payments
  for insert
  to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  );

drop policy if exists "Finance officials can update payments" on public.payments;
create policy "Finance officials can update payments"
  on public.payments
  for update
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  );

drop policy if exists "Admins can delete payments" on public.payments;
create policy "Admins can delete payments"
  on public.payments
  for delete
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

-- Till submissions policies.
drop policy if exists "Members can view own till submissions" on public.till_submissions;
create policy "Members can view own till submissions"
  on public.till_submissions
  for select
  to authenticated
  using (
    member_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  );

drop policy if exists "Members can create own till submissions" on public.till_submissions;
create policy "Members can create own till submissions"
  on public.till_submissions
  for insert
  to authenticated
  with check (member_id = (select auth.uid()));

drop policy if exists "Finance officials can update till submissions" on public.till_submissions;
create policy "Finance officials can update till submissions"
  on public.till_submissions
  for update
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  );

drop policy if exists "Admins can delete till submissions" on public.till_submissions;
create policy "Admins can delete till submissions"
  on public.till_submissions
  for delete
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

-- Approval policies.
drop policy if exists "Members and finance officials can view approvals" on public.approvals;
create policy "Members and finance officials can view approvals"
  on public.approvals
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or exists (
      select 1
      from public.payments p
      where p.id = approvals.payment_id
      and p.member_id = (select auth.uid())
    )
  );

drop policy if exists "Treasurers can create approvals" on public.approvals;
create policy "Treasurers can create approvals"
  on public.approvals
  for insert
  to authenticated
  with check (
    approver = (select auth.uid())
    and (
      public.has_role((select auth.uid()), 'admin')
      or public.has_role((select auth.uid()), 'treasurer')
    )
  );

-- Callback audit policies.
drop policy if exists "Finance officials can view callback audit" on public.mpesa_callback_audit;
create policy "Finance officials can view callback audit"
  on public.mpesa_callback_audit
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  );

drop policy if exists "Finance officials can write callback audit" on public.mpesa_callback_audit;
create policy "Finance officials can write callback audit"
  on public.mpesa_callback_audit
  for insert
  to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
  );

-- Completed payments are immutable for core value fields.
create or replace function public.prevent_completed_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'completed' then
    if new.status is distinct from old.status
       or new.amount is distinct from old.amount
       or new.phone is distinct from old.phone
       or new.method is distinct from old.method
       or new.mpesa_receipt is distinct from old.mpesa_receipt
       or new.member_id is distinct from old.member_id
       or new.checkout_request_id is distinct from old.checkout_request_id
       or new.merchant_request_id is distinct from old.merchant_request_id then
      raise exception 'Completed payments are immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_completed_payment_mutation on public.payments;
create trigger prevent_completed_payment_mutation
  before update on public.payments
  for each row
  execute function public.prevent_completed_payment_mutation();
