-- 1. Create performance index
CREATE INDEX IF NOT EXISTS idx_votes_motion_id
ON votes(motion_id);

-- 2. Create vote count view
CREATE OR REPLACE VIEW voting_motions_with_vote_count AS
SELECT
  vm.id,
  vm.title,
  vm.status,
  vm.created_at,
  COUNT(v.id) AS vote_count
FROM voting_motions vm
LEFT JOIN votes v ON v.motion_id = vm.id
GROUP BY vm.id;

-- 3. Create yes/no breakdown view
CREATE OR REPLACE VIEW voting_motions_with_vote_breakdown AS
SELECT
  vm.id,
  vm.title,
  vm.status,
  vm.created_at,
  COUNT(v.id) FILTER (WHERE v.vote = 'yes') AS yes_votes,
  COUNT(v.id) FILTER (WHERE v.vote = 'no')  AS no_votes,
  COUNT(v.id) AS total_votes
FROM voting_motions vm
LEFT JOIN votes v ON v.motion_id = vm.id
GROUP BY vm.id;

-- 4. Verify
SELECT *
FROM voting_motions_with_vote_breakdown
ORDER BY created_at DESC;