
-- Resolve each kitty to its root (round 1) so we can aggregate across all rounds
CREATE OR REPLACE VIEW public.kitty_roots_v AS
WITH RECURSIVE chain AS (
  SELECT id AS kitty_id, COALESCE(parent_kitty_id, id) AS parent_id, id AS current_id
  FROM public.kitties
  UNION ALL
  SELECT c.kitty_id, k.parent_kitty_id, k.id
  FROM chain c
  JOIN public.kitties k ON k.id = c.parent_id
  WHERE k.parent_kitty_id IS NOT NULL AND k.parent_kitty_id <> c.current_id
)
SELECT kitty_id,
       COALESCE(
         (SELECT current_id FROM chain c2 WHERE c2.kitty_id = c.kitty_id AND c2.parent_id = c2.current_id LIMIT 1),
         (SELECT current_id FROM chain c3 WHERE c3.kitty_id = c.kitty_id ORDER BY 1 DESC LIMIT 1)
       ) AS root_id
FROM chain c
GROUP BY kitty_id;

ALTER VIEW public.kitty_roots_v SET (security_invoker = true);

-- Per-kitty-group (across all rounds) top contributors
CREATE OR REPLACE VIEW public.kitty_top_contributors_per_kitty_v AS
SELECT
  r.root_id AS kitty_id,
  kc.member_id,
  p.full_name,
  p.membership_number,
  p.photo_url,
  COUNT(*)::int AS contribution_count,
  SUM(kc.amount)::numeric AS total_amount
FROM public.kitty_contributions kc
JOIN public.kitty_roots_v r ON r.kitty_id = kc.kitty_id
LEFT JOIN public.profiles p ON p.id = kc.member_id
WHERE kc.status = 'completed'
GROUP BY r.root_id, kc.member_id, p.full_name, p.membership_number, p.photo_url;

ALTER VIEW public.kitty_top_contributors_per_kitty_v SET (security_invoker = true);

-- Aggregated totals per kitty group (across all rounds)
CREATE OR REPLACE VIEW public.kitty_group_totals_v AS
SELECT
  r.root_id AS kitty_id,
  COUNT(DISTINCT k.id)::int AS rounds_count,
  COALESCE(SUM(k.total_contributed), 0)::numeric AS total_contributed_all_rounds,
  COALESCE(SUM(k.total_disbursed), 0)::numeric AS total_disbursed_all_rounds,
  COALESCE(SUM(k.balance), 0)::numeric AS combined_balance
FROM public.kitty_roots_v r
JOIN public.kitties k ON k.id = r.kitty_id
GROUP BY r.root_id;

ALTER VIEW public.kitty_group_totals_v SET (security_invoker = true);

GRANT SELECT ON public.kitty_roots_v TO authenticated;
GRANT SELECT ON public.kitty_group_totals_v TO authenticated;
