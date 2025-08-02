-- Update existing therapist roles to coach
UPDATE profiles SET role = 'coach' WHERE role = 'therapist';

-- Update existing patient roles to student  
UPDATE profiles SET role = 'student' WHERE role = 'patient';

-- Update the check constraint to use new role names
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('coach', 'student'));

-- Update any comments or descriptions in the database
COMMENT ON COLUMN profiles.role IS 'User role: coach (manages students) or student (receives training)';