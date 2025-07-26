-- Pulisce tutti i dati di test dal database mantenendo la struttura

-- Prima eliminiamo le sessioni di esercizio (dipendono da exercises)
DELETE FROM exercise_sessions;

-- Poi eliminiamo gli esercizi
DELETE FROM exercises;

-- Eliminiamo le liste di parole personalizzate
DELETE FROM word_lists;

-- Eliminiamo i pazienti (ma manteniamo i terapisti)
DELETE FROM profiles WHERE role = 'patient';

-- Reset delle sequenze se necessario
-- (PostgreSQL gestisce automaticamente gli UUID quindi non è necessario)