-- Create voting motion aggregate views used by the dashboard
create or replace view public.voting_motions_with_vote_breakdown as
select
  m.id,
  m.title,
  m.status,
  m.created_at,
  coalesce(sum(case when v.vote = 'for' then 1 else 0 end), 0) as yes_votes,
  coalesce(sum(case when v.vote = 'against' then 1 else 0 end), 0) as no_votes,
  coalesce(count(v.id), 0) as total_votes
from public.voting_motions m
left join public.votes v on v.motion_id = m.id
group by m.id, m.title, m.status, m.created_at;

create or replace view public.voting_motions_with_vote_count as
select
  m.id,
  m.title,
  m.status,
  m.created_at,
  coalesce(count(v.id), 0) as vote_count
from public.voting_motions m
left join public.votes v on v.motion_id = m.id
group by m.id, m.title, m.status, m.created_at;

grant select on public.voting_motions_with_vote_breakdown to authenticated;
grant select on public.voting_motions_with_vote_count to authenticated;
