-- Update handle_new_user function to include location and occupation from metadata
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
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
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