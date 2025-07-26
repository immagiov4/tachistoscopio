-- Add policy to allow therapists to insert sessions for their patients
CREATE POLICY "Therapists can insert sessions for their patients" 
ON public.exercise_sessions 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.created_by = get_current_profile_id()
      AND profiles.role = 'patient'
  )
);