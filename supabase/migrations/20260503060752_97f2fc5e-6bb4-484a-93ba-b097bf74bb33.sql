-- Remove public read policy on votes; only authenticated users can read votes per RLS.
DROP POLICY IF EXISTS "Allow read votes" ON public.votes;