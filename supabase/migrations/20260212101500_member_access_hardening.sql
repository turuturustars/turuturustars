-- Enforce read-only behavior for pending/suspended members while preserving full official access.

create or replace function public.can_interact_with_system(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _user_id is not null
    and (
      public.is_official(_user_id)
      or exists (
        select 1
        from public.profiles p
        where p.id = _user_id
          and p.status = 'active'
      )
    );
$$;

grant execute on function public.can_interact_with_system(uuid) to anon, authenticated, service_role;

-- Contributions: members can only create rows when active.
drop policy if exists "Users can create their own contributions" on public.contributions;
create policy "Users can create their own contributions"
  on public.contributions
  for insert
  to authenticated
  with check (
    member_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

-- Notifications: pending/suspended members stay read-only.
drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

-- Notification preferences are mutable only for interact-capable users.
drop policy if exists notification_prefs_insert_policy on public.notification_preferences;
create policy notification_prefs_insert_policy
  on public.notification_preferences
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists notification_prefs_update_policy on public.notification_preferences;
create policy notification_prefs_update_policy
  on public.notification_preferences
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

-- Group chat interactions.
drop policy if exists "Users can create messages" on public.messages;
create policy "Users can create messages"
  on public.messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists "Users can add reactions" on public.message_reactions;
create policy "Users can add reactions"
  on public.message_reactions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists "Users can remove their reactions" on public.message_reactions;
create policy "Users can remove their reactions"
  on public.message_reactions
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and public.can_interact_with_system((select auth.uid()))
  );

-- Private messaging interactions.
drop policy if exists "Users can create conversations" on public.private_conversations;
create policy "Users can create conversations"
  on public.private_conversations
  for insert
  to authenticated
  with check (
    (
      (select auth.uid()) = participant_one
      or (select auth.uid()) = participant_two
    )
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists "Users can send messages in their conversations" on public.private_messages;
create policy "Users can send messages in their conversations"
  on public.private_messages
  for insert
  to authenticated
  with check (
    public.can_interact_with_system((select auth.uid()))
    and exists (
      select 1
      from public.private_conversations pc
      where pc.id = conversation_id
        and (
          (select auth.uid()) = pc.participant_one
          or (select auth.uid()) = pc.participant_two
        )
    )
  );

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'private_messages'
      and column_name = 'recipient_id'
  ) then
    drop policy if exists "Users can update read status of received messages" on public.private_messages;
    create policy "Users can update read status of received messages"
      on public.private_messages
      for update
      to authenticated
      using (
        recipient_id = (select auth.uid())
        and public.can_interact_with_system((select auth.uid()))
      )
      with check (
        recipient_id = (select auth.uid())
        and public.can_interact_with_system((select auth.uid()))
      );
  end if;
end
$$;

-- Typing indicators.
drop policy if exists "Users can update their typing status" on public.typing_indicators;
create policy "Users can update their typing status"
  on public.typing_indicators
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists "Users can update their typing indicator" on public.typing_indicators;
create policy "Users can update their typing indicator"
  on public.typing_indicators
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and public.can_interact_with_system((select auth.uid()))
  )
  with check (
    (select auth.uid()) = user_id
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists "Users can delete their typing indicator" on public.typing_indicators;
create policy "Users can delete their typing indicator"
  on public.typing_indicators
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and public.can_interact_with_system((select auth.uid()))
  );

-- Voting.
drop policy if exists "Members can cast vote" on public.votes;
create policy "Members can cast vote"
  on public.votes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = member_id
    and public.can_interact_with_system((select auth.uid()))
  );

-- M-Pesa self-service transactions.
drop policy if exists "Members can create own payments" on public.payments;
create policy "Members can create own payments"
  on public.payments
  for insert
  to authenticated
  with check (
    member_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

drop policy if exists "Members can create own till submissions" on public.till_submissions;
create policy "Members can create own till submissions"
  on public.till_submissions
  for insert
  to authenticated
  with check (
    member_id = (select auth.uid())
    and public.can_interact_with_system((select auth.uid()))
  );

-- Membership status notifications for both approval and rejection/suspension outcomes.
create or replace function public.notify_profile_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status = 'active' then
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      read,
      created_at,
      updated_at
    )
    values (
      new.id,
      'Membership Approved',
      'Your membership has been approved. You now have full access.',
      'approval',
      false,
      now(),
      now()
    );
  elsif new.status is distinct from old.status and new.status = 'suspended' then
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      read,
      created_at,
      updated_at
    )
    values (
      new.id,
      'Membership Status Updated',
      'Your account has been placed under review or rejected. Contact the admin office for guidance.',
      'membership_rejected',
      false,
      now(),
      now()
    );
  end if;

  return new;
end;
$$;
