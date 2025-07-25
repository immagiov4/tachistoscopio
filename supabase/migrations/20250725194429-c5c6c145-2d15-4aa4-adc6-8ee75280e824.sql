-- Fix other policies that might have recursion issues
DROP POLICY IF EXISTS "Therapists can manage their word lists" ON public.word_lists;
DROP POLICY IF EXISTS "Patients can view word lists from their therapists" ON public.word_lists;
DROP POLICY IF EXISTS "Therapists can manage exercises for their patients" ON public.exercises;
DROP POLICY IF EXISTS "Patients can view their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Therapists can view sessions of their patients" ON public.exercise_sessions;

-- Recreate word_lists policies
CREATE POLICY "Therapists can manage their word lists" 
ON public.word_lists 
FOR ALL 
USING (created_by = public.get_current_profile_id());

CREATE POLICY "Patients can view word lists from their therapists" 
ON public.word_lists 
FOR SELECT 
USING (
  created_by IN (
    SELECT created_by FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'patient'
  )
);

-- Recreate exercises policies  
CREATE POLICY "Therapists can manage exercises for their patients" 
ON public.exercises 
FOR ALL 
USING (therapist_id = public.get_current_profile_id());

CREATE POLICY "Patients can view their own exercises" 
ON public.exercises 
FOR SELECT 
USING (patient_id = public.get_current_profile_id());

-- Recreate exercise_sessions policies
CREATE POLICY "Therapists can view sessions of their patients" 
ON public.exercise_sessions 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.profiles 
    WHERE created_by = public.get_current_profile_id()
  )
);