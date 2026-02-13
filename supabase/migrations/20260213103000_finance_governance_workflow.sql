-- Finance governance workflow:
-- - Multi-role approvals for payments, expenditures, and refunds.
-- - Treasurer-only expenditure initiation.
-- - Member-initiated refunds with 80% payout and non-refundable contribution types.

create table if not exists public.finance_approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('payment', 'refund', 'expenditure')),
  entity_id uuid not null,
  required_role text not null check (required_role in ('chairperson', 'admin', 'secretary', 'patron')),
  approver_id uuid references auth.users(id),
  approver_role text,
  decision text not null default 'pending' check (decision in ('pending', 'approved', 'rejected')),
  notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint finance_approvals_entity_role_uniq unique (entity_type, entity_id, required_role)
);

create index if not exists finance_approvals_entity_idx
  on public.finance_approvals (entity_type, entity_id);

create index if not exists finance_approvals_decision_idx
  on public.finance_approvals (decision, created_at desc);

create table if not exists public.expenditures (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null check (amount > 0),
  category text not null,
  description text not null,
  payment_method text not null default 'manual' check (payment_method in ('manual', 'automatic')),
  initiated_by uuid not null references auth.users(id),
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected')),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenditures_status_created_at_idx
  on public.expenditures (status, created_at desc);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  contribution_type text not null,
  original_amount numeric not null check (original_amount > 0),
  requested_amount numeric not null check (requested_amount > 0),
  payout_amount numeric not null check (payout_amount > 0),
  reason text,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected', 'paid')),
  initiated_by uuid not null references auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refund_requests_requested_lte_original check (requested_amount <= original_amount),
  constraint refund_requests_non_refundable_types check (
    contribution_type not in ('welfare', 'registration', 'membership_fee')
  ),
  constraint refund_requests_payout_rule check (
    round((requested_amount * 0.8)::numeric, 2) = round(payout_amount, 2)
  )
);

create index if not exists refund_requests_member_created_at_idx
  on public.refund_requests (member_id, created_at desc);

create index if not exists refund_requests_status_created_at_idx
  on public.refund_requests (status, created_at desc);

create unique index if not exists refund_requests_pending_per_contribution_uniq
  on public.refund_requests (contribution_id, member_id)
  where status in ('pending_approval', 'approved');

create or replace function public.set_updated_at_timestamp()
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

drop trigger if exists set_updated_at_expenditures on public.expenditures;
create trigger set_updated_at_expenditures
  before update on public.expenditures
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists set_updated_at_refund_requests on public.refund_requests;
create trigger set_updated_at_refund_requests
  before update on public.refund_requests
  for each row
  execute function public.set_updated_at_timestamp();

create or replace function public.ensure_finance_approvals(_entity_type text, _entity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _entity_id is null then
    return;
  end if;

  insert into public.finance_approvals (entity_type, entity_id, required_role)
  select _entity_type, _entity_id, role_name
  from unnest(array['chairperson', 'admin', 'secretary', 'patron']) as role_name
  on conflict (entity_type, entity_id, required_role) do nothing;
end;
$$;

create or replace function public.seed_payment_finance_approvals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'awaiting_approval'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.ensure_finance_approvals('payment', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seed_payment_finance_approvals on public.payments;
create trigger trg_seed_payment_finance_approvals
  after insert or update on public.payments
  for each row
  execute function public.seed_payment_finance_approvals();

create or replace function public.seed_refund_finance_approvals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending_approval'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.ensure_finance_approvals('refund', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seed_refund_finance_approvals on public.refund_requests;
create trigger trg_seed_refund_finance_approvals
  after insert or update on public.refund_requests
  for each row
  execute function public.seed_refund_finance_approvals();

create or replace function public.seed_expenditure_finance_approvals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending_approval'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.ensure_finance_approvals('expenditure', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seed_expenditure_finance_approvals on public.expenditures;
create trigger trg_seed_expenditure_finance_approvals
  after insert or update on public.expenditures
  for each row
  execute function public.seed_expenditure_finance_approvals();

alter table public.finance_approvals enable row level security;
alter table public.expenditures enable row level security;
alter table public.refund_requests enable row level security;

drop policy if exists "Officials and owners can view finance approvals" on public.finance_approvals;
create policy "Officials and owners can view finance approvals"
  on public.finance_approvals
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
    or (
      entity_type = 'payment'
      and exists (
        select 1
        from public.payments p
        where p.id = finance_approvals.entity_id
          and p.member_id = (select auth.uid())
      )
    )
    or (
      entity_type = 'refund'
      and exists (
        select 1
        from public.refund_requests r
        where r.id = finance_approvals.entity_id
          and r.member_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Members and officials can view expenditures" on public.expenditures;
create policy "Members and officials can view expenditures"
  on public.expenditures
  for select
  to authenticated
  using (
    status = 'approved'
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Treasurer can create expenditures" on public.expenditures;
create policy "Treasurer can create expenditures"
  on public.expenditures
  for insert
  to authenticated
  with check (
    initiated_by = (select auth.uid())
    and public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Members and officials can view refund requests" on public.refund_requests;
create policy "Members and officials can view refund requests"
  on public.refund_requests
  for select
  to authenticated
  using (
    member_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Members can create refund requests" on public.refund_requests;
create policy "Members can create refund requests"
  on public.refund_requests
  for insert
  to authenticated
  with check (
    member_id = (select auth.uid())
    and initiated_by = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );
