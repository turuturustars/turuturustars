-- Correct kitty round grouping so child rounds aggregate under the first round.
CREATE OR REPLACE VIEW public.kitty_roots_v AS
WITH RECURSIVE ancestry AS (
  SELECT
    k.id AS kitty_id,
    k.id AS current_id,
    k.parent_kitty_id,
    0 AS depth
  FROM public.kitties k

  UNION ALL

  SELECT
    a.kitty_id,
    parent.id AS current_id,
    parent.parent_kitty_id,
    a.depth + 1 AS depth
  FROM ancestry a
  JOIN public.kitties parent ON parent.id = a.parent_kitty_id
  WHERE a.parent_kitty_id IS NOT NULL
    AND a.depth < 25
),
roots AS (
  SELECT DISTINCT ON (kitty_id)
    kitty_id,
    current_id AS root_id
  FROM ancestry
  WHERE parent_kitty_id IS NULL
  ORDER BY kitty_id, depth DESC
)
SELECT
  k.id AS kitty_id,
  COALESCE(r.root_id, k.id) AS root_id
FROM public.kitties k
LEFT JOIN roots r ON r.kitty_id = k.id;

ALTER VIEW public.kitty_roots_v SET (security_invoker = true);

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
GRANT SELECT ON public.kitty_top_contributors_per_kitty_v TO authenticated;
GRANT SELECT ON public.kitty_group_totals_v TO authenticated;
