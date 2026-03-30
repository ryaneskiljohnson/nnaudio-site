-- @fileoverview Keeps public.profiles.email aligned with auth.users.email when auth email changes.
-- @note Mirrors sync_subscriber_email_on_user_update in 20241221000000_create_email_campaigns_system.sql.
-- Apply with your normal workflow (do not db reset).

CREATE OR REPLACE FUNCTION sync_profile_email_on_auth_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL THEN
    UPDATE public.profiles
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_profile_on_user_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email_on_auth_update();
