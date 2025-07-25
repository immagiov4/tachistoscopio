-- Aggiungi politica RLS per permettere ai terapisti di cancellare i loro pazienti
CREATE POLICY "Therapists can delete their patients" 
ON public.profiles 
FOR DELETE 
USING (
  (role = 'patient'::user_role) 
  AND (created_by = get_current_profile_id()) 
  AND (is_therapist() = true)
);