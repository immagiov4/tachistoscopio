-- Fix RLS policy for exercise_sessions to allow patients to insert their own sessions
DROP POLICY IF EXISTS "Users can create their own exercise sessions" ON public.exercise_sessions;

CREATE POLICY "Users can create their own exercise sessions" 
ON public.exercise_sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'patient'
  )
);