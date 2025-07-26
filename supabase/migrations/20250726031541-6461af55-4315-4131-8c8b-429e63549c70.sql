-- Fix RLS policies for exercise_sessions - remove conflicting policies and create a single correct one
DROP POLICY IF EXISTS "Patients can create their own sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can create their own exercise sessions" ON public.exercise_sessions;

-- Create a single correct policy for patients to insert their own sessions
CREATE POLICY "Patients can insert their own sessions" 
ON public.exercise_sessions 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'patient'
  )
);