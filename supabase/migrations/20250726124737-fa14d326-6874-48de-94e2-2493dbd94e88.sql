-- Create 30 test patients with dummy data and invented emails for UI testing
-- Note: These won't have valid auth.users entries, just for UI testing
-- The user_ids are constructed to suggest corresponding fake emails
WITH current_therapist AS (
  SELECT id FROM public.profiles WHERE role = 'therapist' LIMIT 1
),
patient_data AS (
  SELECT 
    generate_series as num,
    CASE (random() * 29)::int
      WHEN 0 THEN 'Marco Rossi'
      WHEN 1 THEN 'Giulia Bianchi'
      WHEN 2 THEN 'Luca Verdi'
      WHEN 3 THEN 'Sofia Neri'
      WHEN 4 THEN 'Alessandro Ferrari'
      WHEN 5 THEN 'Chiara Romano'
      WHEN 6 THEN 'Matteo Ricci'
      WHEN 7 THEN 'Francesca Marino'
      WHEN 8 THEN 'Lorenzo Greco'
      WHEN 9 THEN 'Valentina Conti'
      WHEN 10 THEN 'Davide Lombardi'
      WHEN 11 THEN 'Elena Rizzo'
      WHEN 12 THEN 'Simone Galli'
      WHEN 13 THEN 'Martina Fontana'
      WHEN 14 THEN 'Andrea Villa'
      WHEN 15 THEN 'Camilla Serra'
      WHEN 16 THEN 'Tommaso Benedetti'
      WHEN 17 THEN 'Aurora De Santis'
      WHEN 18 THEN 'Riccardo Pellegrini'
      WHEN 19 THEN 'Beatrice Caruso'
      WHEN 20 THEN 'Gabriele Testa'
      WHEN 21 THEN 'Alice Moretti'
      WHEN 22 THEN 'Michele Ferrara'
      WHEN 23 THEN 'Greta Orlando'
      WHEN 24 THEN 'Edoardo Gentile'
      WHEN 25 THEN 'Noemi Marini'
      WHEN 26 THEN 'Niccolò Costa'
      WHEN 27 THEN 'Luna Cattaneo'
      WHEN 28 THEN 'Federico Bruno'
      ELSE 'Emma Pagani'
    END as full_name
  FROM generate_series(1, 30)
)
INSERT INTO public.profiles (user_id, role, full_name, created_by)
SELECT 
  ('11111111-1111-1111-1111-' || lpad(num::text, 12, '0'))::uuid,
  'patient'::user_role,
  full_name,
  (SELECT id FROM current_therapist)
FROM patient_data;

-- Note: Corresponding fake emails would be:
-- marco.rossi@test.com, giulia.bianchi@test.com, etc.
-- These are for UI testing only and don't exist in auth.users