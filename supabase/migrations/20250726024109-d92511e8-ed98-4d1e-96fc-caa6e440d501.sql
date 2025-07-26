-- Create a function to get patients with their emails for therapists
CREATE OR REPLACE FUNCTION get_patients_with_emails(therapist_profile_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role text,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    u.email
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  WHERE p.role = 'patient' 
    AND p.created_by = therapist_profile_id;
END;
$$;