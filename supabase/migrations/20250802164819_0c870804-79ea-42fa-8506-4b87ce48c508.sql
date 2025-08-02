-- Rename columns in exercises table
ALTER TABLE exercises RENAME COLUMN patient_id TO student_id;
ALTER TABLE exercises RENAME COLUMN therapist_id TO coach_id;

-- Rename columns in exercise_sessions table  
ALTER TABLE exercise_sessions RENAME COLUMN patient_id TO student_id;