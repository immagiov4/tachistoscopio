-- Remove foreign key constraint to allow test data with fake user_ids
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;