-- =============================================================================
-- Security hardening migration
--   1. Prevent non-service-role users from mutating entitlement/billing columns
--      on their own `profiles` row (fixes entitlement escalation + IDOR that
--      relied on writable `customer_id` / `email`).
--   2. Enforce admin authorization inside `get_admin_grant_orders_paginated`
--      by revoking direct EXECUTE from anon/authenticated (the app calls it via
--      the service role after its own admin check, so this does not break it).
--
-- NOTE: Review carefully and run in staging before `supabase db push`.
--       The application has been updated so that:
--         - AuthContext.updateProfile only sends non-privileged columns.
--         - The only owner-context write to `profiles.customer_id` occurs on
--           first purchase when it is still NULL (allowed by the trigger below).
-- =============================================================================

-- 1) Protect entitlement columns on profiles ---------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (webhooks, cron, server-side admin code) may change anything.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For any other role, entitlement/billing columns are immutable.
  NEW.subscription            := OLD.subscription;
  NEW.subscription_expiration := OLD.subscription_expiration;
  NEW.subscription_source     := OLD.subscription_source;
  NEW.trial_expiration        := OLD.trial_expiration;
  NEW.last_stripe_api_check   := OLD.last_stripe_api_check;
  NEW.email                   := OLD.email; -- source of truth is auth.users
  NEW.nnaudio_access_installer_macos_at   := OLD.nnaudio_access_installer_macos_at;
  NEW.nnaudio_access_installer_windows_at := OLD.nnaudio_access_installer_windows_at;

  -- Allow the owner to link their Stripe customer id ONCE (null -> value),
  -- which is the only legitimate owner-context write (first purchase). Any
  -- attempt to change an already-set customer_id is ignored.
  IF OLD.customer_id IS NOT NULL THEN
    NEW.customer_id := OLD.customer_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_entitlements ON public.profiles;
CREATE TRIGGER protect_profile_entitlements
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_entitlements();

-- 2) Lock down the admin grant-orders RPC ------------------------------------
-- The function is SECURITY DEFINER and was directly callable by any
-- authenticated user, leaking grant/redemption orders + emails. The admin UI
-- calls it through the service-role client, which is unaffected by these grants.
-- Revoke EXECUTE from anon/authenticated/PUBLIC across all overloads by OID.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_admin_grant_orders_paginated'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn.sig);
  END LOOP;
END $$;
