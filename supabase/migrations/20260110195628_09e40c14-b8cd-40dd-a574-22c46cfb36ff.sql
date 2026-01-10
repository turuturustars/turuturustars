-- Fix the overly permissive user_roles policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create specific policies for role management
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix the overly permissive contributions policy  
DROP POLICY IF EXISTS "Officials can manage all contributions" ON public.contributions;

CREATE POLICY "Officials can update contributions"
  ON public.contributions FOR UPDATE
  USING (public.is_official(auth.uid()));

CREATE POLICY "Officials can delete contributions"
  ON public.contributions FOR DELETE
  USING (public.is_official(auth.uid()));

CREATE POLICY "Officials can insert contributions"
  ON public.contributions FOR INSERT
  WITH CHECK (public.is_official(auth.uid()));

-- Fix overly permissive announcements policy
DROP POLICY IF EXISTS "Officials can manage announcements" ON public.announcements;

CREATE POLICY "Officials can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (public.is_official(auth.uid()));

CREATE POLICY "Officials can update announcements"
  ON public.announcements FOR UPDATE
  USING (public.is_official(auth.uid()));

CREATE POLICY "Officials can delete announcements"
  ON public.announcements FOR DELETE
  USING (public.is_official(auth.uid()));