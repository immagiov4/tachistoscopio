-- Fix search_path vulnerability in all database functions to prevent schema injection attacks

-- Update get_patients_with_emails function
CREATE OR REPLACE FUNCTION public.get_patients_with_emails(therapist_profile_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, role text, full_name text, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, email character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.role::text,
    p.full_name,
    p.created_at,
    p.updated_at,
    p.created_by,
    COALESCE(u.email, 'nessuna-email@registrata.com')::character varying as email
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  WHERE p.role = 'patient' 
    AND p.created_by = therapist_profile_id;
END;
$function$;

-- Update get_current_user_profile function
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
 RETURNS TABLE(id uuid, role text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.role::TEXT
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
END;
$function$;

-- Update is_therapist function
CREATE OR REPLACE FUNCTION public.is_therapist()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'therapist'
  );
END;
$function$;

-- Update get_current_profile_id function
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$function$;

-- Update handle_new_therapist function
CREATE OR REPLACE FUNCTION public.handle_new_therapist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Only create therapist profile if user signs up directly (not created by admin)
  -- We detect this by checking if the user has user_metadata.full_name
  -- (direct signups have this, admin-created users have it in raw_user_meta_data)
  IF NEW.raw_user_meta_data ? 'full_name' 
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, role, full_name)
    VALUES (
      NEW.id, 
      'therapist', 
      NEW.raw_user_meta_data ->> 'full_name'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;