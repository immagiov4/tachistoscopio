-- Modifica il foreign key constraint per permettere di eliminare esercizi mantenendo le sessioni storiche
-- Rimuovi il constraint esistente
ALTER TABLE exercise_sessions DROP CONSTRAINT IF EXISTS exercise_sessions_exercise_id_fkey;

-- Aggiungi il nuovo constraint che permette SET NULL quando l'esercizio viene eliminato
ALTER TABLE exercise_sessions 
ADD CONSTRAINT exercise_sessions_exercise_id_fkey 
FOREIGN KEY (exercise_id) 
REFERENCES exercises(id) 
ON DELETE SET NULL;