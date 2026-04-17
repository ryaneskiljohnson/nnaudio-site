-- @fileoverview RLS for product_grants and user_management: allow access by user_id or JWT email.
-- @module supabase/migrations/20260416103000_email_keyed_rls_user_id
-- @note Matches pattern in 20251114005553_fix_user_management_rls_email.sql (JWT email).

DROP POLICY IF EXISTS "Users can view their own product_grants" ON public.product_grants;
CREATE POLICY "Users can view their own product_grants" ON public.product_grants
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      user_id = auth.uid()
      OR user_email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Users can view their own user_management" ON public.user_management;
CREATE POLICY "Users can view their own user_management" ON public.user_management
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      user_id = auth.uid()
      OR user_email = (auth.jwt() ->> 'email')
    )
  );
