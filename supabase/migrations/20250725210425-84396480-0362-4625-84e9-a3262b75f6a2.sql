-- Aggiungi policy per permettere ai pazienti di eliminare le proprie sessioni (solo per debug)
CREATE POLICY "Patients can delete their own sessions (debug only)" 
ON public.exercise_sessions 
FOR DELETE 
USING (patient_id IN ( 
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));