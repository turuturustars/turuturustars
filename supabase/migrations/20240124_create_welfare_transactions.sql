-- Welfare Transactions Table
create table if not exists welfare_transactions (
  id uuid primary key default gen_random_uuid(),
  welfare_case_id uuid not null references welfare_cases(id) on delete cascade,
  amount numeric(12, 2) not null,
  transaction_type text not null check (transaction_type in ('contribution', 'refund')),
  mpesa_code text,
  recorded_by_id uuid not null references users(id),
  notes text,
  status text not null check (status in ('completed', 'pending', 'failed')) default 'completed',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for better query performance
create index if not exists idx_welfare_transactions_case on welfare_transactions(welfare_case_id);
create index if not exists idx_welfare_transactions_recorded_by on welfare_transactions(recorded_by_id);
create index if not exists idx_welfare_transactions_created_at on welfare_transactions(created_at desc);

-- Add RLS policies
alter table welfare_transactions enable row level security;

-- Anyone authenticated can view transactions for welfare cases they have access to
create policy "Users can view welfare transactions" on welfare_transactions
  for select using (
    exists (
      select 1 from welfare_cases
      where welfare_cases.id = welfare_transactions.welfare_case_id
    )
  );

-- Only authorized roles can insert transactions
create policy "Authorized roles can insert transactions" on welfare_transactions
  for insert with check (
    exists (
      select 1 from user_roles ur
      join roles r on ur.role_id = r.id
      where ur.user_id = auth.uid()
      and r.role in ('admin', 'chairperson', 'treasurer')
    )
  );

-- Only admin, chairperson, treasurer can delete transactions
create policy "Authorized roles can delete transactions" on welfare_transactions
  for delete using (
    exists (
      select 1 from user_roles ur
      join roles r on ur.role_id = r.id
      where ur.user_id = auth.uid()
      and r.role in ('admin', 'chairperson', 'treasurer')
    )
  );
