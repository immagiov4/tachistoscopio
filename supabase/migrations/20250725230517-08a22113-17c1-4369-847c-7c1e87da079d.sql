-- Creare il trigger per gestire automaticamente la creazione dei profili therapist
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_therapist();