-- Track official/admin WhatsApp actions that create welfare cases.

alter table public.whatsapp_actions
  add column if not exists welfare_case_id uuid references public.welfare_cases(id) on delete set null;

create index if not exists whatsapp_actions_welfare_case_idx
  on public.whatsapp_actions (welfare_case_id)
  where welfare_case_id is not null;
