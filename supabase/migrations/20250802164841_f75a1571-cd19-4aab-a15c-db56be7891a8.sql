-- Update RLS policies to use new column names
DROP POLICY IF EXISTS "Students can view their own exercises" ON exercises;
DROP POLICY IF EXISTS "Coaches can manage exercises for their students" ON exercises;
DROP POLICY IF EXISTS "Students can insert their own sessions" ON exercise_sessions;
DROP POLICY IF EXISTS "Coaches can insert sessions for their students" ON exercise_sessions;
DROP POLICY IF EXISTS "Coaches can view sessions of their students" ON exercise_sessions;

-- Recreate exercises policies with new column names
CREATE POLICY "Students can view their own exercises"
ON exercises FOR SELECT
USING (student_id = get_current_profile_id());

CREATE POLICY "Coaches can manage exercises for their students"
ON exercises FOR ALL
USING (coach_id = get_current_profile_id());

-- Recreate exercise sessions policies with new column names
CREATE POLICY "Students can insert their own sessions"
ON exercise_sessions FOR INSERT
WITH CHECK (student_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'student'
));

CREATE POLICY "Coaches can insert sessions for their students"
ON exercise_sessions FOR INSERT
WITH CHECK (student_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.created_by = get_current_profile_id() AND profiles.role = 'student'
));

CREATE POLICY "Coaches can view sessions of their students"
ON exercise_sessions FOR SELECT
USING (student_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.created_by = get_current_profile_id()
));

-- Keep the existing ones we missed
CREATE POLICY "Users can view their own sessions"
ON exercise_sessions FOR SELECT
USING (student_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Students can delete their own sessions (debug only)"
ON exercise_sessions FOR DELETE
USING (student_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));