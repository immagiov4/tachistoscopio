-- Drop all RLS policies that reference the role column
DROP POLICY IF EXISTS "Therapists can view their patients" ON profiles;
DROP POLICY IF EXISTS "Therapists can create patients" ON profiles;
DROP POLICY IF EXISTS "Therapists can delete their patients" ON profiles;
DROP POLICY IF EXISTS "Patients can view word lists from their therapists" ON word_lists;
DROP POLICY IF EXISTS "Therapists can manage their word lists" ON word_lists;
DROP POLICY IF EXISTS "Patients can view their own exercises" ON exercises;
DROP POLICY IF EXISTS "Therapists can manage exercises for their patients" ON exercises;
DROP POLICY IF EXISTS "Patients can insert their own sessions" ON exercise_sessions;
DROP POLICY IF EXISTS "Therapists can insert sessions for their patients" ON exercise_sessions;
DROP POLICY IF EXISTS "Therapists can view sessions of their patients" ON exercise_sessions;

-- Update/Create functions first
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