-- Lock subscribers so authenticated users cannot SELECT the whole mailing list.
-- Admin UI reads via the service role (unaffected). Users may still see their
-- own subscriber row. Admins using a user-scoped client keep the is_admin() ALL
-- policy from 20260317110000.

DROP POLICY IF EXISTS "Authenticated users can view all subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Authenticated users can view subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view all subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Allow authenticated users to manage subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Allow authenticated users to manage subscribers" ON subscribers;

DROP POLICY IF EXISTS "Users can view own subscriber data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view their own subscriber record" ON public.subscribers;
CREATE POLICY "Users can view own subscriber data"
  ON public.subscribers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
