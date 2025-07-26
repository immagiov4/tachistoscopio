-- Modifica la colonna exercise_id per permettere valori NULL
-- Questo permette di mantenere le sessioni storiche anche quando l'esercizio viene cancellato
ALTER TABLE exercise_sessions 
ALTER COLUMN exercise_id DROP NOT NULL;