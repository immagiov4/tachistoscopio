-- Drop the existing enum values and add new ones
ALTER TYPE user_role RENAME TO user_role_old;

-- Create new enum with coach/student values
CREATE TYPE user_role AS ENUM ('coach', 'student');

-- Update the table to use the new enum
ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role USING 
CASE 
  WHEN role::text = 'therapist' THEN 'coach'::user_role
  WHEN role::text = 'patient' THEN 'student'::user_role
  ELSE 'student'::user_role
END;

-- Drop the old enum
DROP TYPE user_role_old;

-- Update any existing functions to use new role names
CREATE OR REPLACE FUNCTION public.handle_new_therapist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Only create coach profile if user signs up directly (not created by admin)
  -- We detect this by checking if the user has user_metadata.full_name
  -- (direct signups have this, admin-created users have it in raw_user_meta_data)
  IF NEW.raw_user_meta_data ? 'full_name' 
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, role, full_name)
    VALUES (
      NEW.id, 
      'coach', 
      NEW.raw_user_meta_data ->> 'full_name'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_students_with_emails(coach_profile_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, role text, full_name text, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, email character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
  WHERE p.role = 'student' 
    AND p.created_by = coach_profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_coach()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'coach'
  );
END;
$function$;

-- Update column comments
COMMENT ON COLUMN profiles.role IS 'User role: coach (manages students) or student (receives training)';