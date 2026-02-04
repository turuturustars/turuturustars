-- Update is_official() to include all official roles in the current app_role enum
CREATE OR REPLACE FUNCTION public.is_official(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'admin',
        'treasurer',
        'secretary',
        'chairperson',
        'vice_chairman',
        'vice_secretary',
        'organizing_secretary',
        'committee_member',
        'patron',
        'coordinator'
      )
  )
$$;
