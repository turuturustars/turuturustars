-- Explicit Data API grants for Supabase public schema tables.
--
-- Supabase projects created after 2026-05-30 do not grant Data API access to
-- new public schema tables by default. Keep these object grants paired with the
-- RLS policies in the migrations that create or expose each table.

grant usage on schema public to anon, authenticated, service_role;

-- Current app tables exposed to signed-in users through RLS.
grant select, insert, update, delete on table
  public.accounting_accounts,
  public.accounting_journal_entries,
  public.accounting_journal_lines,
  public.accounting_periods,
  public.admin_audit_log,
  public.announcements,
  public.approvals,
  public.audit_logs,
  public.contribution_tracking,
  public.contributions,
  public.discipline_records,
  public.documents,
  public.donations,
  public.expenditures,
  public.finance_approvals,
  public.job_scrape_settings,
  public.job_scrape_sources,
  public.jobs,
  public.kitties,
  public.kitty_beneficiaries,
  public.kitty_contributions,
  public.kitty_disbursements,
  public.meeting_attendance,
  public.meeting_minutes,
  public.meetings,
  public.members,
  public.membership_fees,
  public.message_reactions,
  public.messages,
  public.mpesa_callback_audit,
  public.mpesa_standing_orders,
  public.mpesa_transactions,
  public.notification_preferences,
  public.notifications,
  public.payments,
  public.pesapal_ipn_events,
  public.pesapal_transactions,
  public.private_conversations,
  public.private_messages,
  public.profiles,
  public.realtime_change_log,
  public.refund_requests,
  public.role_handovers,
  public.sms_notifications_queue,
  public.till_submissions,
  public.typing_indicators,
  public.user_roles,
  public.user_status,
  public.votes,
  public.voting_motions,
  public.wallet_transactions,
  public.wallets,
  public.welfare_cases,
  public.welfare_transactions
to authenticated;

-- Current app views exposed to signed-in users through underlying RLS policies.
grant select on table
  public.accounting_trial_balance_v,
  public.kitty_group_totals_v,
  public.kitty_roots_v,
  public.kitty_top_contributors_per_kitty_v,
  public.kitty_top_contributors_v,
  public.membership_fee_history_v,
  public.recent_changes,
  public.voting_motions_with_vote_breakdown,
  public.voting_motions_with_vote_count
to authenticated;

-- Public unauthenticated surfaces used by the website.
grant select on table
  public.announcements,
  public.jobs
to anon;

grant insert on table
  public.donations,
  public.members
to anon;

-- Preserve the existing signup hardening: verification session rows are only
-- accessed through trusted server-side code and SECURITY DEFINER functions.
revoke all on table public.sms_verification_sessions from anon, authenticated;

-- Service role clients and Edge Functions need full object access; RLS bypass
-- still depends on the Supabase service key, not these grants alone.
grant all privileges on table
  public.accounting_accounts,
  public.accounting_journal_entries,
  public.accounting_journal_lines,
  public.accounting_periods,
  public.admin_audit_log,
  public.announcements,
  public.approvals,
  public.audit_logs,
  public.contribution_tracking,
  public.contributions,
  public.discipline_records,
  public.documents,
  public.donations,
  public.expenditures,
  public.finance_approvals,
  public.job_scrape_settings,
  public.job_scrape_sources,
  public.jobs,
  public.kitties,
  public.kitty_beneficiaries,
  public.kitty_contributions,
  public.kitty_disbursements,
  public.meeting_attendance,
  public.meeting_minutes,
  public.meetings,
  public.members,
  public.membership_fees,
  public.message_reactions,
  public.messages,
  public.mpesa_callback_audit,
  public.mpesa_standing_orders,
  public.mpesa_transactions,
  public.notification_preferences,
  public.notifications,
  public.payments,
  public.pesapal_ipn_events,
  public.pesapal_transactions,
  public.private_conversations,
  public.private_messages,
  public.profiles,
  public.realtime_change_log,
  public.refund_requests,
  public.role_handovers,
  public.sms_notifications_queue,
  public.sms_verification_sessions,
  public.till_submissions,
  public.typing_indicators,
  public.user_roles,
  public.user_status,
  public.votes,
  public.voting_motions,
  public.wallet_transactions,
  public.wallets,
  public.welfare_cases,
  public.welfare_transactions
to service_role;

grant select on table
  public.accounting_trial_balance_v,
  public.kitty_group_totals_v,
  public.kitty_roots_v,
  public.kitty_top_contributors_per_kitty_v,
  public.kitty_top_contributors_v,
  public.membership_fee_history_v,
  public.recent_changes,
  public.voting_motions_with_vote_breakdown,
  public.voting_motions_with_vote_count
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;
