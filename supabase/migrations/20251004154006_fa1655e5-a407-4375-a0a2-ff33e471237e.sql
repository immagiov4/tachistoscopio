-- Fix the get_patients_with_emails function to use 'student' instead of 'patient'
DROP FUNCTION IF EXISTS public.get_patients_with_emails(uuid);

-- Create updated function with correct role
CREATE OR REPLACE FUNCTION public.get_students_with_emails(coach_profile_id uuid)
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  role text, 
  full_name text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  created_by uuid, 
  email character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;