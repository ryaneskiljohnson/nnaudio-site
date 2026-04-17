-- @fileoverview Keeps product_grants.user_email and user_management.user_email aligned with auth.users.email.
-- @module supabase/migrations/20260416102000_sync_email_keyed_tables_on_auth
-- @note Apply with your normal workflow (do not db reset).

CREATE OR REPLACE FUNCTION public.sync_email_keyed_tables_on_auth_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL THEN
    UPDATE public.product_grants
    SET user_email = NEW.email, updated_at = NOW()
    WHERE user_id = NEW.id
       OR (user_id IS NULL AND lower(user_email) = lower(OLD.email));

    UPDATE public.user_management
    SET user_email = NEW.email
    WHERE user_id = NEW.id
       OR (user_id IS NULL AND lower(user_email) = lower(OLD.email));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER sync_email_keyed_tables_on_user_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_keyed_tables_on_auth_update();

CREATE OR REPLACE FUNCTION public.backfill_user_id_on_auth_signup()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.product_grants
  SET user_id = NEW.id, updated_at = NOW()
  WHERE user_id IS NULL AND lower(user_email) = lower(NEW.email);

  UPDATE public.user_management
  SET user_id = NEW.id
  WHERE user_id IS NULL AND lower(user_email) = lower(NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trigger_backfill_user_id_on_auth_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.backfill_user_id_on_auth_signup();
