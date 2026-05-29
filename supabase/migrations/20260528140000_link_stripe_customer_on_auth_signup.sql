-- @fileoverview Copy Stripe customer_id from auth metadata onto profiles at signup.
-- @module supabase/migrations/20260528140000_link_stripe_customer_on_auth_signup

CREATE OR REPLACE FUNCTION public.backfill_user_id_on_auth_signup()
RETURNS TRIGGER AS $$
DECLARE
  meta_customer_id text;
BEGIN
  UPDATE public.product_grants
  SET user_id = NEW.id, updated_at = NOW()
  WHERE user_id IS NULL AND lower(user_email) = lower(NEW.email);

  UPDATE public.user_management
  SET user_id = NEW.id
  WHERE user_id IS NULL AND lower(user_email) = lower(NEW.email);

  meta_customer_id := NULLIF(trim(NEW.raw_user_meta_data->>'customer_id'), '');
  IF meta_customer_id IS NOT NULL THEN
    UPDATE public.profiles
    SET customer_id = meta_customer_id, updated_at = NOW()
    WHERE id = NEW.id
      AND (customer_id IS NULL OR customer_id = '');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
