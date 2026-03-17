-- Subscribers RLS: admins see all rows, not just own
-- The previous policy "Admins can manage or users can view own subscriber data"
-- restricted non-admins to only the row where user_id = auth.uid(), so the UI showed 1 subscriber.

DROP POLICY IF EXISTS "Admins can manage or users can view own subscriber data" ON public.subscribers;

CREATE POLICY "Admins can manage all subscribers"
  ON public.subscribers
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view all subscribers"
  ON public.subscribers
  FOR SELECT
  USING (auth.role() = 'authenticated');
