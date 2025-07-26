-- Elimina tutti i dati di test dal database
DELETE FROM exercise_sessions WHERE patient_id IN (
  SELECT id FROM profiles WHERE user_id::text LIKE '11111111-1111-1111-1111-%'
);

DELETE FROM exercises WHERE patient_id IN (
  SELECT id FROM profiles WHERE user_id::text LIKE '11111111-1111-1111-1111-%'
);

DELETE FROM profiles WHERE user_id::text LIKE '11111111-1111-1111-1111-%';

-- Aggiorna la funzione get_patients_with_emails per rimuovere la logica di test
CREATE OR REPLACE FUNCTION public.get_patients_with_emails(therapist_profile_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, role text, full_name text, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, email character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  WHERE p.role = 'patient' 
    AND p.created_by = therapist_profile_id;
END;
$function$