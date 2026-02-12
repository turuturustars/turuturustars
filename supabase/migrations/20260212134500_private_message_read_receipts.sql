-- Enable secure read-receipt updates for private conversations.
create or replace function public.mark_private_conversation_read(_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_interact_with_system((select auth.uid())) then
    return 0;
  end if;

  if not exists (
    select 1
    from public.private_conversations pc
    where pc.id = _conversation_id
      and (
        pc.participant_one = (select auth.uid())
        or pc.participant_two = (select auth.uid())
      )
  ) then
    return 0;
  end if;

  update public.private_messages pm
  set read_at = now()
  where pm.conversation_id = _conversation_id
    and pm.sender_id <> (select auth.uid())
    and pm.read_at is null;

  get diagnostics updated_rows = row_count;
  return coalesce(updated_rows, 0);
end;
$$;

revoke all on function public.mark_private_conversation_read(uuid) from public;
grant execute on function public.mark_private_conversation_read(uuid) to authenticated;
grant execute on function public.mark_private_conversation_read(uuid) to service_role;
