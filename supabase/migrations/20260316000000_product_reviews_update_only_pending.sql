-- Restrict product_reviews UPDATE so users can only edit reviews that are still pending.
-- Approved or rejected reviews can no longer be updated by the customer.

DROP POLICY IF EXISTS "Users can update their own customer reviews" ON public.product_reviews;
CREATE POLICY "Users can update their own customer reviews"
  ON public.product_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND submission_source = 'customer'
    AND COALESCE(is_approved, false) = false
    AND moderation_status = 'pending'
  );
