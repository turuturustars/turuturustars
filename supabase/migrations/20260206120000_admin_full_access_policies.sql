-- Admin full-access policies for all RLS-enabled tables
-- Ensures users with role 'admin' can perform all actions

-- Profiles
DROP POLICY IF EXISTS "admin_full_access_profiles" ON public.profiles;
CREATE POLICY "admin_full_access_profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- User roles
DROP POLICY IF EXISTS "admin_full_access_user_roles" ON public.user_roles;
CREATE POLICY "admin_full_access_user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Welfare cases
DROP POLICY IF EXISTS "admin_full_access_welfare_cases" ON public.welfare_cases;
CREATE POLICY "admin_full_access_welfare_cases"
  ON public.welfare_cases
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Contributions
DROP POLICY IF EXISTS "admin_full_access_contributions" ON public.contributions;
CREATE POLICY "admin_full_access_contributions"
  ON public.contributions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Contribution tracking
DROP POLICY IF EXISTS "admin_full_access_contribution_tracking" ON public.contribution_tracking;
CREATE POLICY "admin_full_access_contribution_tracking"
  ON public.contribution_tracking
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Notifications
DROP POLICY IF EXISTS "admin_full_access_notifications" ON public.notifications;
CREATE POLICY "admin_full_access_notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Announcements
DROP POLICY IF EXISTS "admin_full_access_announcements" ON public.announcements;
CREATE POLICY "admin_full_access_announcements"
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Members
DROP POLICY IF EXISTS "admin_full_access_members" ON public.members;
CREATE POLICY "admin_full_access_members"
  ON public.members
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Audit logs
DROP POLICY IF EXISTS "admin_full_access_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_full_access_audit_logs"
  ON public.audit_logs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- M-Pesa transactions
DROP POLICY IF EXISTS "admin_full_access_mpesa_transactions" ON public.mpesa_transactions;
CREATE POLICY "admin_full_access_mpesa_transactions"
  ON public.mpesa_transactions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- M-Pesa standing orders
DROP POLICY IF EXISTS "admin_full_access_mpesa_standing_orders" ON public.mpesa_standing_orders;
CREATE POLICY "admin_full_access_mpesa_standing_orders"
  ON public.mpesa_standing_orders
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Documents
DROP POLICY IF EXISTS "admin_full_access_documents" ON public.documents;
CREATE POLICY "admin_full_access_documents"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Meeting minutes
DROP POLICY IF EXISTS "admin_full_access_meeting_minutes" ON public.meeting_minutes;
CREATE POLICY "admin_full_access_meeting_minutes"
  ON public.meeting_minutes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Meetings
DROP POLICY IF EXISTS "admin_full_access_meetings" ON public.meetings;
CREATE POLICY "admin_full_access_meetings"
  ON public.meetings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Meeting attendance
DROP POLICY IF EXISTS "admin_full_access_meeting_attendance" ON public.meeting_attendance;
CREATE POLICY "admin_full_access_meeting_attendance"
  ON public.meeting_attendance
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Discipline records
DROP POLICY IF EXISTS "admin_full_access_discipline_records" ON public.discipline_records;
CREATE POLICY "admin_full_access_discipline_records"
  ON public.discipline_records
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Role handovers
DROP POLICY IF EXISTS "admin_full_access_role_handovers" ON public.role_handovers;
CREATE POLICY "admin_full_access_role_handovers"
  ON public.role_handovers
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Voting motions
DROP POLICY IF EXISTS "admin_full_access_voting_motions" ON public.voting_motions;
CREATE POLICY "admin_full_access_voting_motions"
  ON public.voting_motions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Votes
DROP POLICY IF EXISTS "admin_full_access_votes" ON public.votes;
CREATE POLICY "admin_full_access_votes"
  ON public.votes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Messages
DROP POLICY IF EXISTS "admin_full_access_messages" ON public.messages;
CREATE POLICY "admin_full_access_messages"
  ON public.messages
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Message reactions
DROP POLICY IF EXISTS "admin_full_access_message_reactions" ON public.message_reactions;
CREATE POLICY "admin_full_access_message_reactions"
  ON public.message_reactions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Private conversations
DROP POLICY IF EXISTS "admin_full_access_private_conversations" ON public.private_conversations;
CREATE POLICY "admin_full_access_private_conversations"
  ON public.private_conversations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Private messages
DROP POLICY IF EXISTS "admin_full_access_private_messages" ON public.private_messages;
CREATE POLICY "admin_full_access_private_messages"
  ON public.private_messages
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Typing indicators
DROP POLICY IF EXISTS "admin_full_access_typing_indicators" ON public.typing_indicators;
CREATE POLICY "admin_full_access_typing_indicators"
  ON public.typing_indicators
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Membership fees
DROP POLICY IF EXISTS "admin_full_access_membership_fees" ON public.membership_fees;
CREATE POLICY "admin_full_access_membership_fees"
  ON public.membership_fees
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Notification preferences
DROP POLICY IF EXISTS "admin_full_access_notification_preferences" ON public.notification_preferences;
CREATE POLICY "admin_full_access_notification_preferences"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Jobs
DROP POLICY IF EXISTS "admin_full_access_jobs" ON public.jobs;
CREATE POLICY "admin_full_access_jobs"
  ON public.jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

