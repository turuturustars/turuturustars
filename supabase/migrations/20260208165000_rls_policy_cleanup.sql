-- RLS policy cleanup and performance improvements
-- - Remove duplicate/permissive policies
-- - Recreate canonical policies with (select auth.uid())
-- - Limit policies to intended roles
-- - Drop duplicate jobs indexes

-- ============================================================================
-- Drop duplicate indexes on jobs
-- ============================================================================

DROP INDEX IF EXISTS public.idx_jobs_status;
DROP INDEX IF EXISTS public.idx_jobs_deadline;
DROP INDEX IF EXISTS public.idx_jobs_county;
DROP INDEX IF EXISTS public.idx_jobs_job_type;
DROP INDEX IF EXISTS public.idx_jobs_is_priority;

-- ============================================================================
-- Drop legacy/duplicate policies
-- ============================================================================

-- Conservative select policies (auto-created / legacy)
DROP POLICY IF EXISTS "Conservative select (20260130) for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Conservative select (20260130) for user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Conservative select (20260130) for contributions" ON public.contributions;
DROP POLICY IF EXISTS "Conservative select (20260130) for contribution_tracking" ON public.contribution_tracking;
DROP POLICY IF EXISTS "Conservative select (20260130) for notifications" ON public.notifications;
DROP POLICY IF EXISTS "Conservative select (20260130) for announcements" ON public.announcements;
DROP POLICY IF EXISTS "Conservative select (20260130) for messages" ON public.messages;
DROP POLICY IF EXISTS "Conservative select (20260130) for message_reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Conservative select (20260130) for private_conversations" ON public.private_conversations;
DROP POLICY IF EXISTS "Conservative select (20260130) for private_messages" ON public.private_messages;
DROP POLICY IF EXISTS "Conservative select (20260130) for typing_indicators" ON public.typing_indicators;

-- Profiles duplicates
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Officials can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Officials can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles created via trigger" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow update own profile" ON public.profiles;

-- User roles duplicates
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Contributions duplicates
DROP POLICY IF EXISTS "Officials can manage all contributions" ON public.contributions;

-- Welfare cases duplicates
DROP POLICY IF EXISTS "Officials can manage welfare cases" ON public.welfare_cases;

-- Announcements duplicates
DROP POLICY IF EXISTS "Officials can manage announcements" ON public.announcements;

-- Notifications duplicates
DROP POLICY IF EXISTS "Users can see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Notification preferences duplicates
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view their notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their notification preferences" ON public.notification_preferences;

-- Jobs duplicates
DROP POLICY IF EXISTS "Anyone can view approved jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;

-- ============================================================================
-- Canonical policies (performance-optimized)
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy
  ON public.profiles FOR INSERT
  TO authenticated, service_role
  WITH CHECK ((select auth.role()) = 'service_role' OR (select auth.uid()) = id);

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy
  ON public.profiles FOR SELECT
  TO authenticated, service_role
  USING (
    (select auth.role()) = 'service_role'
    OR (select auth.uid()) = id
    OR public.is_official((select auth.uid()))
  );

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy
  ON public.profiles FOR UPDATE
  TO authenticated, service_role
  USING (
    (select auth.role()) = 'service_role'
    OR (select auth.uid()) = id
    OR public.is_official((select auth.uid()))
  )
  WITH CHECK (
    (select auth.role()) = 'service_role'
    OR (select auth.uid()) = id
    OR public.is_official((select auth.uid()))
  );

-- User roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Contributions
DROP POLICY IF EXISTS "Users can view their own contributions" ON public.contributions;
CREATE POLICY "Users can view their own contributions"
  ON public.contributions FOR SELECT
  TO authenticated
  USING (member_id = (select auth.uid()));

DROP POLICY IF EXISTS "Officials can view all contributions" ON public.contributions;
CREATE POLICY "Officials can view all contributions"
  ON public.contributions FOR SELECT
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Users can create their own contributions" ON public.contributions;
CREATE POLICY "Users can create their own contributions"
  ON public.contributions FOR INSERT
  TO authenticated
  WITH CHECK (member_id = (select auth.uid()));

DROP POLICY IF EXISTS "Officials can insert contributions" ON public.contributions;
CREATE POLICY "Officials can insert contributions"
  ON public.contributions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can update contributions" ON public.contributions;
CREATE POLICY "Officials can update contributions"
  ON public.contributions FOR UPDATE
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can delete contributions" ON public.contributions;
CREATE POLICY "Officials can delete contributions"
  ON public.contributions FOR DELETE
  TO authenticated
  USING (public.is_official((select auth.uid())));

-- Contribution tracking
DROP POLICY IF EXISTS "Users can view their own tracking" ON public.contribution_tracking;
CREATE POLICY "Users can view their own tracking"
  ON public.contribution_tracking FOR SELECT
  TO authenticated
  USING (member_id = (select auth.uid()));

DROP POLICY IF EXISTS "Officials can view all tracking" ON public.contribution_tracking;
CREATE POLICY "Officials can view all tracking"
  ON public.contribution_tracking FOR SELECT
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can update tracking" ON public.contribution_tracking;
CREATE POLICY "Officials can update tracking"
  ON public.contribution_tracking FOR UPDATE
  TO authenticated
  USING (public.is_official((select auth.uid())));

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Officials can create notifications" ON public.notifications;
CREATE POLICY "Officials can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_official((select auth.uid())));

-- Announcements
DROP POLICY IF EXISTS "Anyone can view published announcements" ON public.announcements;
CREATE POLICY "Anyone can view published announcements"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (published = true);

DROP POLICY IF EXISTS "Officials can view all announcements" ON public.announcements;
CREATE POLICY "Officials can view all announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can insert announcements" ON public.announcements;
CREATE POLICY "Officials can insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can update announcements" ON public.announcements;
CREATE POLICY "Officials can update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can delete announcements" ON public.announcements;
CREATE POLICY "Officials can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.is_official((select auth.uid())));

-- Welfare cases
DROP POLICY IF EXISTS "Officials and beneficiaries can view welfare cases" ON public.welfare_cases;
CREATE POLICY "Officials and beneficiaries can view welfare cases"
  ON public.welfare_cases FOR SELECT
  TO authenticated
  USING (
    public.is_official((select auth.uid()))
    OR beneficiary_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Officials can insert welfare cases" ON public.welfare_cases;
CREATE POLICY "Officials can insert welfare cases"
  ON public.welfare_cases FOR INSERT
  TO authenticated
  WITH CHECK (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can update welfare cases" ON public.welfare_cases;
CREATE POLICY "Officials can update welfare cases"
  ON public.welfare_cases FOR UPDATE
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can delete welfare cases" ON public.welfare_cases;
CREATE POLICY "Officials can delete welfare cases"
  ON public.welfare_cases FOR DELETE
  TO authenticated
  USING (public.is_official((select auth.uid())));

-- User status (guarded for environments where the table is not present)
DO $$
BEGIN
  IF to_regclass('public.user_status') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view all statuses" ON public.user_status;
    CREATE POLICY "Users can view all statuses"
      ON public.user_status FOR SELECT
      TO authenticated
      USING ((select auth.uid()) IS NOT NULL);

    DROP POLICY IF EXISTS "Users can upsert their status" ON public.user_status;
    CREATE POLICY "Users can upsert their status"
      ON public.user_status FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can update their status" ON public.user_status;
    CREATE POLICY "Users can update their status"
      ON public.user_status FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;
END
$$;

-- Notification preferences
DROP POLICY IF EXISTS notification_prefs_select_policy ON public.notification_preferences;
CREATE POLICY notification_prefs_select_policy
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS notification_prefs_insert_policy ON public.notification_preferences;
CREATE POLICY notification_prefs_insert_policy
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS notification_prefs_update_policy ON public.notification_preferences;
CREATE POLICY notification_prefs_update_policy
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Messages
DROP POLICY IF EXISTS "Users can view all messages" ON public.messages;
CREATE POLICY "Users can view all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
CREATE POLICY "Users can create messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = sender_id);

-- Message reactions
DROP POLICY IF EXISTS "Users can view all reactions" ON public.message_reactions;
CREATE POLICY "Users can view all reactions"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Private conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.private_conversations;
CREATE POLICY "Users can view their conversations"
  ON public.private_conversations FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = participant_one
    OR (select auth.uid()) = participant_two
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.private_conversations;
CREATE POLICY "Users can create conversations"
  ON public.private_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = participant_one
    OR (select auth.uid()) = participant_two
  );

-- Private messages
DROP POLICY IF EXISTS "Users can view their conversation messages" ON public.private_messages;
CREATE POLICY "Users can view their conversation messages"
  ON public.private_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.private_conversations pc
      WHERE pc.id = conversation_id
        AND (
          (select auth.uid()) = pc.participant_one
          OR (select auth.uid()) = pc.participant_two
        )
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.private_messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.private_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.private_conversations pc
      WHERE pc.id = conversation_id
        AND (
          (select auth.uid()) = pc.participant_one
          OR (select auth.uid()) = pc.participant_two
        )
    )
  );

DROP POLICY IF EXISTS "Users can update read status of received messages" ON public.private_messages;
CREATE POLICY "Users can update read status of received messages"
  ON public.private_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()));

-- Typing indicators
DROP POLICY IF EXISTS "Users can view typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can view typing indicators"
  ON public.typing_indicators FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their typing status" ON public.typing_indicators;
CREATE POLICY "Users can update their typing status"
  ON public.typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their typing indicator" ON public.typing_indicators;
CREATE POLICY "Users can update their typing indicator"
  ON public.typing_indicators FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their typing indicator" ON public.typing_indicators;
CREATE POLICY "Users can delete their typing indicator"
  ON public.typing_indicators FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Meetings
DROP POLICY IF EXISTS "Authenticated can view meetings" ON public.meetings;
CREATE POLICY "Authenticated can view meetings"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "MC can insert meetings" ON public.meetings;
CREATE POLICY "MC can insert meetings"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management_committee((select auth.uid())));

DROP POLICY IF EXISTS "MC can update meetings" ON public.meetings;
CREATE POLICY "MC can update meetings"
  ON public.meetings FOR UPDATE
  TO authenticated
  USING (public.is_management_committee((select auth.uid())));

DROP POLICY IF EXISTS "MC can delete meetings" ON public.meetings;
CREATE POLICY "MC can delete meetings"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (public.is_management_committee((select auth.uid())));

-- Meeting attendance
DROP POLICY IF EXISTS "Members view own or officials view all attendance" ON public.meeting_attendance;
CREATE POLICY "Members view own or officials view all attendance"
  ON public.meeting_attendance FOR SELECT
  TO authenticated
  USING (
    member_id = (select auth.uid())
    OR public.is_official((select auth.uid()))
  );

DROP POLICY IF EXISTS "MC can insert attendance" ON public.meeting_attendance;
CREATE POLICY "MC can insert attendance"
  ON public.meeting_attendance FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management_committee((select auth.uid())));

DROP POLICY IF EXISTS "MC can update attendance" ON public.meeting_attendance;
CREATE POLICY "MC can update attendance"
  ON public.meeting_attendance FOR UPDATE
  TO authenticated
  USING (public.is_management_committee((select auth.uid())));

DROP POLICY IF EXISTS "MC can delete attendance" ON public.meeting_attendance;
CREATE POLICY "MC can delete attendance"
  ON public.meeting_attendance FOR DELETE
  TO authenticated
  USING (public.is_management_committee((select auth.uid())));

-- Discipline records
DROP POLICY IF EXISTS "View own or officials view discipline" ON public.discipline_records;
CREATE POLICY "View own or officials view discipline"
  ON public.discipline_records FOR SELECT
  TO authenticated
  USING (
    member_id = (select auth.uid())
    OR public.is_official((select auth.uid()))
  );

DROP POLICY IF EXISTS "Org sec and admin can insert discipline" ON public.discipline_records;
CREATE POLICY "Org sec and admin can insert discipline"
  ON public.discipline_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'organizing_secretary'::app_role)
    OR public.has_role((select auth.uid()), 'admin'::app_role)
    OR public.has_role((select auth.uid()), 'chairperson'::app_role)
  );

DROP POLICY IF EXISTS "Org sec and admin can update discipline" ON public.discipline_records;
CREATE POLICY "Org sec and admin can update discipline"
  ON public.discipline_records FOR UPDATE
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'organizing_secretary'::app_role)
    OR public.has_role((select auth.uid()), 'admin'::app_role)
    OR public.has_role((select auth.uid()), 'chairperson'::app_role)
  );

DROP POLICY IF EXISTS "Org sec and admin can delete discipline" ON public.discipline_records;
CREATE POLICY "Org sec and admin can delete discipline"
  ON public.discipline_records FOR DELETE
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::app_role)
    OR public.has_role((select auth.uid()), 'chairperson'::app_role)
  );

-- Role handovers
DROP POLICY IF EXISTS "MC or involved can view handovers" ON public.role_handovers;
CREATE POLICY "MC or involved can view handovers"
  ON public.role_handovers FOR SELECT
  TO authenticated
  USING (
    public.is_management_committee((select auth.uid()))
    OR original_user_id = (select auth.uid())
    OR acting_user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Admin and chair can insert handovers" ON public.role_handovers;
CREATE POLICY "Admin and chair can insert handovers"
  ON public.role_handovers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::app_role)
    OR public.has_role((select auth.uid()), 'chairperson'::app_role)
  );

DROP POLICY IF EXISTS "Admin and chair can update handovers" ON public.role_handovers;
CREATE POLICY "Admin and chair can update handovers"
  ON public.role_handovers FOR UPDATE
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::app_role)
    OR public.has_role((select auth.uid()), 'chairperson'::app_role)
  );

DROP POLICY IF EXISTS "Admin and chair can delete handovers" ON public.role_handovers;
CREATE POLICY "Admin and chair can delete handovers"
  ON public.role_handovers FOR DELETE
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::app_role)
    OR public.has_role((select auth.uid()), 'chairperson'::app_role)
  );

-- Voting motions
DROP POLICY IF EXISTS "Authenticated can view motions" ON public.voting_motions;
CREATE POLICY "Authenticated can view motions"
  ON public.voting_motions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "MC can insert motions" ON public.voting_motions;
CREATE POLICY "MC can insert motions"
  ON public.voting_motions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_management_committee((select auth.uid())));

DROP POLICY IF EXISTS "MC can update motions" ON public.voting_motions;
CREATE POLICY "MC can update motions"
  ON public.voting_motions FOR UPDATE
  TO authenticated
  USING (public.is_management_committee((select auth.uid())));

DROP POLICY IF EXISTS "MC can delete motions" ON public.voting_motions;
CREATE POLICY "MC can delete motions"
  ON public.voting_motions FOR DELETE
  TO authenticated
  USING (public.is_management_committee((select auth.uid())));

-- Votes
DROP POLICY IF EXISTS "Authenticated can view votes" ON public.votes;
CREATE POLICY "Authenticated can view votes"
  ON public.votes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can cast vote" ON public.votes;
CREATE POLICY "Members can cast vote"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = member_id);

-- Members
DROP POLICY IF EXISTS "Anyone can register as member" ON public.members;
CREATE POLICY "Anyone can register as member"
  ON public.members FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(email)) >= 5
    AND position('@' in email) > 1
    AND length(trim(phone)) >= 7
  );

DROP POLICY IF EXISTS "Officials can view member registrations" ON public.members;
CREATE POLICY "Officials can view member registrations"
  ON public.members FOR SELECT
  TO authenticated
  USING (public.is_official((select auth.uid())));

-- Membership fees
DROP POLICY IF EXISTS "Users can view their own membership fees" ON public.membership_fees;
CREATE POLICY "Users can view their own membership fees"
  ON public.membership_fees FOR SELECT
  TO authenticated
  USING (
    member_id = (select auth.uid())
    OR public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
    OR public.has_role((select auth.uid()), 'chairperson')
  );

DROP POLICY IF EXISTS "Treasurer and admin can manage membership fees" ON public.membership_fees;
CREATE POLICY "Treasurer and admin can manage membership fees"
  ON public.membership_fees FOR ALL
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
  );

-- Audit logs
DROP POLICY IF EXISTS "Financial officials can view audit logs" ON public.audit_logs;
CREATE POLICY "Financial officials can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
    OR public.has_role((select auth.uid()), 'chairperson')
  );

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = (select auth.uid()));

-- M-Pesa transactions
DROP POLICY IF EXISTS "Financial officials can view mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Financial officials can view mpesa transactions"
  ON public.mpesa_transactions FOR SELECT
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
    OR public.has_role((select auth.uid()), 'chairperson')
    OR member_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Financial officials can insert mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Financial officials can insert mpesa transactions"
  ON public.mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
    OR public.has_role((select auth.uid()), 'chairperson')
  );

DROP POLICY IF EXISTS "Financial officials can update mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Financial officials can update mpesa transactions"
  ON public.mpesa_transactions FOR UPDATE
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
    OR public.has_role((select auth.uid()), 'chairperson')
  );

DROP POLICY IF EXISTS "Financial officials can delete mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Financial officials can delete mpesa transactions"
  ON public.mpesa_transactions FOR DELETE
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
    OR public.has_role((select auth.uid()), 'chairperson')
  );

-- M-Pesa standing orders
DROP POLICY IF EXISTS "Financial officials can manage standing orders" ON public.mpesa_standing_orders;
CREATE POLICY "Financial officials can manage standing orders"
  ON public.mpesa_standing_orders FOR ALL
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'treasurer')
    OR public.has_role((select auth.uid()), 'chairperson')
  );

DROP POLICY IF EXISTS "Members can view their standing orders" ON public.mpesa_standing_orders;
CREATE POLICY "Members can view their standing orders"
  ON public.mpesa_standing_orders FOR SELECT
  TO authenticated
  USING (member_id = (select auth.uid()));

-- Documents
DROP POLICY IF EXISTS "Officials can manage documents" ON public.documents;
CREATE POLICY "Officials can manage documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Members can view public documents" ON public.documents;
CREATE POLICY "Members can view public documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Meeting minutes
DROP POLICY IF EXISTS "Secretary can manage meeting minutes" ON public.meeting_minutes;
CREATE POLICY "Secretary can manage meeting minutes"
  ON public.meeting_minutes FOR ALL
  TO authenticated
  USING (
    public.has_role((select auth.uid()), 'secretary')
    OR public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'chairperson')
  );

DROP POLICY IF EXISTS "Members can view approved minutes" ON public.meeting_minutes;
CREATE POLICY "Members can view approved minutes"
  ON public.meeting_minutes FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Donations
DROP POLICY IF EXISTS "Public can create donations" ON public.donations;
CREATE POLICY "Public can create donations"
  ON public.donations FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    amount > 0
    AND currency IS NOT NULL
    AND length(trim(currency)) >= 3
  );

DROP POLICY IF EXISTS "Officials can view donations" ON public.donations;
CREATE POLICY "Officials can view donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Officials can update donations" ON public.donations;
CREATE POLICY "Officials can update donations"
  ON public.donations FOR UPDATE
  TO authenticated
  USING (public.is_official((select auth.uid())))
  WITH CHECK (public.is_official((select auth.uid())));

-- Pesapal IPN events
DROP POLICY IF EXISTS "Officials can view pesapal ipn events" ON public.pesapal_ipn_events;
CREATE POLICY "Officials can view pesapal ipn events"
  ON public.pesapal_ipn_events FOR SELECT
  TO authenticated
  USING (public.is_official((select auth.uid())));

-- Jobs
DROP POLICY IF EXISTS "Public jobs read" ON public.jobs;
CREATE POLICY "Public jobs read"
  ON public.jobs FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' AND deadline IS NOT NULL AND deadline >= now());

DROP POLICY IF EXISTS "Official jobs read" ON public.jobs;
CREATE POLICY "Official jobs read"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (public.is_official((select auth.uid())));

DROP POLICY IF EXISTS "Official jobs update" ON public.jobs;
CREATE POLICY "Official jobs update"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (public.is_official((select auth.uid())));

-- ============================================================================
-- Admin full-access policies (updated for auth.uid() performance)
-- ============================================================================

DROP POLICY IF EXISTS "admin_full_access_profiles" ON public.profiles;
CREATE POLICY "admin_full_access_profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_user_roles" ON public.user_roles;
CREATE POLICY "admin_full_access_user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_welfare_cases" ON public.welfare_cases;
CREATE POLICY "admin_full_access_welfare_cases"
  ON public.welfare_cases FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_contributions" ON public.contributions;
CREATE POLICY "admin_full_access_contributions"
  ON public.contributions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_contribution_tracking" ON public.contribution_tracking;
CREATE POLICY "admin_full_access_contribution_tracking"
  ON public.contribution_tracking FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_notifications" ON public.notifications;
CREATE POLICY "admin_full_access_notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_announcements" ON public.announcements;
CREATE POLICY "admin_full_access_announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_members" ON public.members;
CREATE POLICY "admin_full_access_members"
  ON public.members FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_full_access_audit_logs"
  ON public.audit_logs FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_mpesa_transactions" ON public.mpesa_transactions;
CREATE POLICY "admin_full_access_mpesa_transactions"
  ON public.mpesa_transactions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_mpesa_standing_orders" ON public.mpesa_standing_orders;
CREATE POLICY "admin_full_access_mpesa_standing_orders"
  ON public.mpesa_standing_orders FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_documents" ON public.documents;
CREATE POLICY "admin_full_access_documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_meeting_minutes" ON public.meeting_minutes;
CREATE POLICY "admin_full_access_meeting_minutes"
  ON public.meeting_minutes FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_meetings" ON public.meetings;
CREATE POLICY "admin_full_access_meetings"
  ON public.meetings FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_meeting_attendance" ON public.meeting_attendance;
CREATE POLICY "admin_full_access_meeting_attendance"
  ON public.meeting_attendance FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_discipline_records" ON public.discipline_records;
CREATE POLICY "admin_full_access_discipline_records"
  ON public.discipline_records FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_role_handovers" ON public.role_handovers;
CREATE POLICY "admin_full_access_role_handovers"
  ON public.role_handovers FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_voting_motions" ON public.voting_motions;
CREATE POLICY "admin_full_access_voting_motions"
  ON public.voting_motions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_votes" ON public.votes;
CREATE POLICY "admin_full_access_votes"
  ON public.votes FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_messages" ON public.messages;
CREATE POLICY "admin_full_access_messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_message_reactions" ON public.message_reactions;
CREATE POLICY "admin_full_access_message_reactions"
  ON public.message_reactions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_private_conversations" ON public.private_conversations;
CREATE POLICY "admin_full_access_private_conversations"
  ON public.private_conversations FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_private_messages" ON public.private_messages;
CREATE POLICY "admin_full_access_private_messages"
  ON public.private_messages FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_typing_indicators" ON public.typing_indicators;
CREATE POLICY "admin_full_access_typing_indicators"
  ON public.typing_indicators FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_membership_fees" ON public.membership_fees;
CREATE POLICY "admin_full_access_membership_fees"
  ON public.membership_fees FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_notification_preferences" ON public.notification_preferences;
CREATE POLICY "admin_full_access_notification_preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_full_access_jobs" ON public.jobs;
CREATE POLICY "admin_full_access_jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::app_role));
