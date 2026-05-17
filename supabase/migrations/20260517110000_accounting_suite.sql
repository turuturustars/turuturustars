-- Accounting suite foundation:
-- - Richer expenditure metadata for treasurer/admin entry.
-- - Chart of accounts and journal tables for balanced accounting reports.
-- - Admins can record expenditures alongside treasurers.

alter table public.expenditures
  add column if not exists expense_date date not null default current_date,
  add column if not exists payee text,
  add column if not exists reference_number text,
  add column if not exists receipt_url text,
  add column if not exists fund text not null default 'general',
  add column if not exists account_code text,
  add column if not exists notes text;

alter table public.expenditures
  drop constraint if exists expenditures_payment_method_check;

alter table public.expenditures
  add constraint expenditures_payment_method_check
  check (payment_method in ('manual', 'automatic', 'cash', 'bank', 'mpesa', 'wallet'));

create index if not exists expenditures_expense_date_idx
  on public.expenditures (expense_date desc);

create index if not exists expenditures_category_idx
  on public.expenditures (category);

create index if not exists expenditures_fund_idx
  on public.expenditures (fund);

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id uuid references public.accounting_accounts(id),
  system_key text unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounting_accounts_type_idx
  on public.accounting_accounts (account_type, code);

create table if not exists public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint accounting_periods_date_order check (start_date <= end_date)
);

create index if not exists accounting_periods_dates_idx
  on public.accounting_periods (start_date, end_date);

create table if not exists public.accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_no bigserial unique,
  entry_date date not null default current_date,
  description text not null,
  source_type text,
  source_id uuid,
  status text not null default 'posted' check (status in ('draft', 'posted', 'void')),
  created_by uuid references auth.users(id),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists accounting_journal_entries_source_uniq
  on public.accounting_journal_entries (source_type, source_id)
  where source_type is not null and source_id is not null;

create index if not exists accounting_journal_entries_date_idx
  on public.accounting_journal_entries (entry_date desc, status);

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.accounting_journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounting_accounts(id),
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  memo text,
  created_at timestamptz not null default now(),
  constraint accounting_journal_line_one_side check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  )
);

create index if not exists accounting_journal_lines_entry_idx
  on public.accounting_journal_lines (journal_entry_id);

create index if not exists accounting_journal_lines_account_idx
  on public.accounting_journal_lines (account_id);

create or replace view public.accounting_trial_balance_v as
select
  aa.id as account_id,
  aa.code,
  aa.name,
  aa.account_type,
  coalesce(sum(case when aje.status = 'posted' then ajl.debit else 0 end), 0)::numeric(14, 2) as debit_total,
  coalesce(sum(case when aje.status = 'posted' then ajl.credit else 0 end), 0)::numeric(14, 2) as credit_total,
  case
    when aa.account_type in ('asset', 'expense') then coalesce(sum(case when aje.status = 'posted' then ajl.debit - ajl.credit else 0 end), 0)::numeric(14, 2)
    else coalesce(sum(case when aje.status = 'posted' then ajl.credit - ajl.debit else 0 end), 0)::numeric(14, 2)
  end as balance
from public.accounting_accounts aa
left join public.accounting_journal_lines ajl on ajl.account_id = aa.id
left join public.accounting_journal_entries aje on aje.id = ajl.journal_entry_id
where aa.is_active = true
group by aa.id, aa.code, aa.name, aa.account_type;

create or replace function public.assert_accounting_entry_balanced(_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  debit_total numeric;
  credit_total numeric;
begin
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into debit_total, credit_total
  from public.accounting_journal_lines
  where journal_entry_id = _entry_id;

  if round(debit_total, 2) <> round(credit_total, 2) then
    raise exception 'Accounting journal entry % is not balanced: debits %, credits %', _entry_id, debit_total, credit_total;
  end if;
end;
$$;

insert into public.accounting_accounts (code, name, account_type, system_key, description)
values
  ('1000', 'Cash and Bank', 'asset', 'cash_bank', 'Cash, bank, and verified liquid balances'),
  ('1010', 'M-Pesa Clearing', 'asset', 'mpesa_clearing', 'M-Pesa collections awaiting reconciliation'),
  ('1100', 'Contribution Receivables', 'asset', 'contribution_receivables', 'Expected but unpaid member contributions'),
  ('2000', 'Accounts Payable', 'liability', 'accounts_payable', 'Approved obligations not yet paid'),
  ('2100', 'Member Wallet Liability', 'liability', 'member_wallet_liability', 'Member wallet balances held by the organization'),
  ('3000', 'Accumulated Fund Balance', 'equity', 'accumulated_fund_balance', 'Accumulated surplus or deficit'),
  ('4000', 'Member Contributions', 'income', 'member_contributions', 'General member contribution income'),
  ('4010', 'Membership Fees', 'income', 'membership_fees', 'Membership fee income'),
  ('4020', 'Welfare Contributions', 'income', 'welfare_contributions', 'Welfare contribution income'),
  ('4030', 'Kitty Contributions', 'income', 'kitty_contributions', 'Community kitty contribution income'),
  ('4040', 'Donations', 'income', 'donations', 'Donations and grants'),
  ('4100', 'Other Income', 'income', 'other_income', 'Other operating income'),
  ('5000', 'Welfare Disbursements', 'expense', 'welfare_disbursements', 'Approved welfare payouts'),
  ('5100', 'Program Expenses', 'expense', 'program_expenses', 'Direct program and project expenditure'),
  ('5200', 'Administration Expenses', 'expense', 'administration_expenses', 'Office and administration expenditure'),
  ('5300', 'Finance Charges', 'expense', 'finance_charges', 'M-Pesa, bank, and transaction charges'),
  ('5400', 'Refunds Paid', 'expense', 'refunds_paid', 'Approved member refunds paid'),
  ('5990', 'Uncategorized Expense', 'expense', 'uncategorized_expense', 'Temporary category for expenses pending classification')
on conflict (code) do update
set
  name = excluded.name,
  account_type = excluded.account_type,
  system_key = excluded.system_key,
  description = excluded.description,
  updated_at = now();

alter table public.accounting_accounts enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;

drop policy if exists "Finance officials can view accounting accounts" on public.accounting_accounts;
create policy "Finance officials can view accounting accounts"
  on public.accounting_accounts
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Admins and treasurers can manage accounting accounts" on public.accounting_accounts;
create policy "Admins and treasurers can manage accounting accounts"
  on public.accounting_accounts
  for all
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Finance officials can view accounting periods" on public.accounting_periods;
create policy "Finance officials can view accounting periods"
  on public.accounting_periods
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Admins and treasurers can manage accounting periods" on public.accounting_periods;
create policy "Admins and treasurers can manage accounting periods"
  on public.accounting_periods
  for all
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Finance officials can view journal entries" on public.accounting_journal_entries;
create policy "Finance officials can view journal entries"
  on public.accounting_journal_entries
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Admins and treasurers can manage journal entries" on public.accounting_journal_entries;
create policy "Admins and treasurers can manage journal entries"
  on public.accounting_journal_entries
  for all
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Finance officials can view journal lines" on public.accounting_journal_lines;
create policy "Finance officials can view journal lines"
  on public.accounting_journal_lines
  for select
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
    or public.has_role((select auth.uid()), 'chairperson')
    or public.has_role((select auth.uid()), 'secretary')
    or public.has_role((select auth.uid()), 'patron')
  );

drop policy if exists "Admins and treasurers can manage journal lines" on public.accounting_journal_lines;
create policy "Admins and treasurers can manage journal lines"
  on public.accounting_journal_lines
  for all
  to authenticated
  using (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  )
  with check (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'treasurer')
  );

drop policy if exists "Treasurer can create expenditures" on public.expenditures;
drop policy if exists "Treasurers and admins can create expenditures" on public.expenditures;
create policy "Treasurers and admins can create expenditures"
  on public.expenditures
  for insert
  to authenticated
  with check (
    initiated_by = (select auth.uid())
    and (
      public.has_role((select auth.uid()), 'treasurer')
      or public.has_role((select auth.uid()), 'admin')
    )
  );
