-- Aggiungo foreign key constraints con CASCADE per garantire eliminazioni automatiche
-- e prevenire errori di foreign key constraint

-- Elimino i constraint esistenti se ci sono
ALTER TABLE exercise_sessions DROP CONSTRAINT IF EXISTS exercise_sessions_patient_id_fkey;
ALTER TABLE exercise_sessions DROP CONSTRAINT IF EXISTS exercise_sessions_exercise_id_fkey;
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_patient_id_fkey;

-- Aggiungo i nuovi constraint con CASCADE DELETE
ALTER TABLE exercises 
ADD CONSTRAINT exercises_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE exercise_sessions 
ADD CONSTRAINT exercise_sessions_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE exercise_sessions 
ADD CONSTRAINT exercise_sessions_exercise_id_fkey 
FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

-- Ora quando elimino un profilo paziente, verranno eliminati automaticamente:
-- 1. Tutti i suoi esercizi (exercises)
-- 2. Tutte le sue sessioni (exercise_sessions)
-- E quando elimino un esercizio, verranno eliminate automaticamente tutte le sue sessioni