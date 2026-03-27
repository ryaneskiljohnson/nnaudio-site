-- @fileoverview Promotions RLS: allow admins when `admins.user` is user id (text) or email.
-- @note Remote schema compared `admins.user` only to `profiles.email`; rows store UUID strings → inserts denied.

DROP POLICY IF EXISTS "Admins can insert promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins can update promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins can delete promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins or public can view promotions" ON public.promotions;

CREATE POLICY "Admins can insert promotions"
  ON public.promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a."user" = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
         OR a."user" = (auth.uid())::text
    )
  );

CREATE POLICY "Admins can update promotions"
  ON public.promotions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a."user" = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
         OR a."user" = (auth.uid())::text
    )
  );

CREATE POLICY "Admins can delete promotions"
  ON public.promotions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a."user" = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
         OR a."user" = (auth.uid())::text
    )
  );

CREATE POLICY "Admins or public can view promotions"
  ON public.promotions
  FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.admins a
        WHERE a."user" = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
           OR a."user" = (auth.uid())::text
      )
    )
    OR (active = true)
  );
