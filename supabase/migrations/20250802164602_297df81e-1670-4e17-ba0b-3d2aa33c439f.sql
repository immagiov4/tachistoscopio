-- Drop all RLS policies that reference the role column
DROP POLICY "Therapists can view their patients" ON profiles;
DROP POLICY "Therapists can create patients" ON profiles;
DROP POLICY "Therapists can delete their patients" ON profiles;
DROP POLICY "Patients can view word lists from their therapists" ON word_lists;
DROP POLICY "Therapists can manage their word lists" ON word_lists;
DROP POLICY "Patients can view their own exercises" ON exercises;
DROP POLICY "Therapists can manage exercises for their patients" ON exercises;
DROP POLICY "Patients can insert their own sessions" ON exercise_sessions;
DROP POLICY "Therapists can insert sessions for their patients" ON exercise_sessions;
DROP POLICY "Therapists can view sessions of their patients" ON exercise_sessions;

-- Now we can safely change the enum
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('coach', 'student');

-- Update the table to use the new enum
ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role USING 
CASE 
  WHEN role::text = 'therapist' THEN 'coach'::user_role
  WHEN role::text = 'patient' THEN 'student'::user_role
  ELSE 'student'::user_role
END;

-- Drop the old enum
DROP TYPE user_role_old;

-- Recreate all RLS policies with new role names
-- Profiles policies
CREATE POLICY "Coaches can view their students"
ON profiles FOR SELECT
USING (role = 'student' AND created_by = get_current_profile_id() AND is_coach() = true);

CREATE POLICY "Coaches can create students"
ON profiles FOR INSERT
WITH CHECK (role = 'student' AND created_by = get_current_profile_id() AND is_coach() = true);

CREATE POLICY "Coaches can delete their students"
ON profiles FOR DELETE
USING (role = 'student' AND created_by = get_current_profile_id() AND is_coach() = true);

-- Word lists policies
CREATE POLICY "Students can view word lists from their coaches"
ON word_lists FOR SELECT
USING (created_by IN (
  SELECT profiles.created_by
  FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'student'
));

CREATE POLICY "Coaches can manage their word lists"
ON word_lists FOR ALL
USING (created_by = get_current_profile_id());

-- Exercises policies
CREATE POLICY "Students can view their own exercises"
ON exercises FOR SELECT
USING (patient_id = get_current_profile_id());

CREATE POLICY "Coaches can manage exercises for their students"
ON exercises FOR ALL
USING (therapist_id = get_current_profile_id());

-- Exercise sessions policies
CREATE POLICY "Students can insert their own sessions"
ON exercise_sessions FOR INSERT
WITH CHECK (patient_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'student'
));

CREATE POLICY "Coaches can insert sessions for their students"
ON exercise_sessions FOR INSERT
WITH CHECK (patient_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.created_by = get_current_profile_id() AND profiles.role = 'student'
));

CREATE POLICY "Coaches can view sessions of their students"
ON exercise_sessions FOR SELECT
USING (patient_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.created_by = get_current_profile_id()
));