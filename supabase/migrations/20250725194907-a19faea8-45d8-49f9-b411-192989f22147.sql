-- Fix the trigger to not create profiles automatically for all users
-- Only therapists should get auto-profiles, patients are created via edge function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simpler trigger that only creates therapist profiles for direct signups
-- (patients will be created by the edge function with the correct role)
CREATE OR REPLACE FUNCTION public.handle_new_therapist()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for therapist signup only
CREATE TRIGGER on_therapist_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_therapist();