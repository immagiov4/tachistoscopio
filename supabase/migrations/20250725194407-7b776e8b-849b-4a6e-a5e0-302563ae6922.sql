-- Drop existing problematic policies
DROP POLICY IF EXISTS "Therapists can view their patients" ON public.profiles;
DROP POLICY IF EXISTS "Therapists can create patients" ON public.profiles;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.role::TEXT
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_therapist()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'therapist'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate policies using security definer functions
CREATE POLICY "Therapists can view their patients" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'patient' AND 
  created_by = public.get_current_profile_id() AND
  public.is_therapist() = true
);

CREATE POLICY "Therapists can create patients" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  role = 'patient' AND 
  created_by = public.get_current_profile_id() AND
  public.is_therapist() = true
);