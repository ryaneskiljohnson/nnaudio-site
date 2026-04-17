-- @fileoverview Normalizes user_email on insert/update for product_grants and user_management.
-- @module supabase/migrations/20260417101000_email_casing_trigger
-- @note Apply with your normal workflow (do not db reset).

CREATE OR REPLACE FUNCTION public.normalize_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_email IS NOT NULL THEN
    NEW.user_email := lower(trim(NEW.user_email));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_normalize_user_email_product_grants
  ON public.product_grants;
CREATE TRIGGER trg_normalize_user_email_product_grants
  BEFORE INSERT OR UPDATE OF user_email ON public.product_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_user_email();

DROP TRIGGER IF EXISTS trg_normalize_user_email_user_management
  ON public.user_management;
CREATE TRIGGER trg_normalize_user_email_user_management
  BEFORE INSERT OR UPDATE OF user_email ON public.user_management
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_user_email();

COMMENT ON FUNCTION public.normalize_user_email() IS
  'Lowercases and trims user_email for consistent lookups and unique indexes';
