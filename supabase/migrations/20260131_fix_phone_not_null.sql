-- Fix 500 error on signup: allow phone to be NULL
-- Issue: handle_new_user trigger tries to insert empty string for phone field which is NOT NULL
-- Solution: Make phone field nullable with default NULL, or allow empty strings

-- Make phone column nullable with NULL default
ALTER TABLE public.profiles
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN phone SET DEFAULT NULL;

-- Update the handle_new_user trigger function to handle phone properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, membership_number, id_number, location, occupation)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New Member'),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),  -- Use NULL if phone is empty string
    NEW.email,
    generate_membership_number(),
    NEW.raw_user_meta_data ->> 'id_number',
    NEW.raw_user_meta_data ->> 'location',
    NEW.raw_user_meta_data ->> 'occupation'
  );
  
  -- Assign default member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  -- Create contribution tracking record
  INSERT INTO public.contribution_tracking (member_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;
