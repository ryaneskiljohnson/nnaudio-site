-- Product review submission, moderation, and follow-up reward system.
-- Adds customer-review metadata to product_reviews and creates order-level
-- follow-up tracking for delayed review invitations and one-time rewards.

BEGIN;

ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS moderation_status text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submission_source text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

UPDATE public.product_reviews
SET moderation_status = CASE
    WHEN COALESCE(is_approved, false) THEN 'approved'
    ELSE 'pending'
  END
WHERE moderation_status IS NULL;

UPDATE public.product_reviews
SET submission_source = CASE
    WHEN user_id IS NULL THEN 'seed'
    ELSE 'customer'
  END
WHERE submission_source IS NULL;

ALTER TABLE public.product_reviews
  ALTER COLUMN moderation_status SET DEFAULT 'pending',
  ALTER COLUMN moderation_status SET NOT NULL,
  ALTER COLUMN submission_source SET DEFAULT 'seed',
  ALTER COLUMN submission_source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_reviews_moderation_status_check'
  ) THEN
    ALTER TABLE public.product_reviews
      ADD CONSTRAINT product_reviews_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_reviews_submission_source_check'
  ) THEN
    ALTER TABLE public.product_reviews
      ADD CONSTRAINT product_reviews_submission_source_check
      CHECK (submission_source IN ('seed', 'customer', 'admin', 'script', 'migration'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_user_product_unique
  ON public.product_reviews(user_id, product_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_reviews_user_id_idx
  ON public.product_reviews(user_id);

CREATE INDEX IF NOT EXISTS product_reviews_moderation_status_idx
  ON public.product_reviews(moderation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS product_reviews_payment_intent_idx
  ON public.product_reviews(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.review_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text UNIQUE,
  checkout_session_id text UNIQUE,
  stripe_customer_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  purchased_product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  purchase_source text NOT NULL DEFAULT 'payment_intent',
  purchase_date timestamptz NOT NULL,
  send_at timestamptz NOT NULL,
  invite_sent_at timestamptz,
  invite_email_message_id text,
  reward_claimed_at timestamptz,
  reward_review_id uuid REFERENCES public.product_reviews(id) ON DELETE SET NULL,
  stripe_coupon_id text,
  stripe_promotion_code_id text,
  stripe_promotion_code text,
  reward_email_sent_at timestamptz,
  reward_email_message_id text,
  is_refunded boolean NOT NULL DEFAULT false,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'review_followups_purchase_source_check'
  ) THEN
    ALTER TABLE public.review_followups
      ADD CONSTRAINT review_followups_purchase_source_check
      CHECK (purchase_source IN ('payment_intent', 'checkout_session', 'bundle_lifetime', 'bundle_subscription'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS review_followups_user_id_idx
  ON public.review_followups(user_id, send_at);

CREATE INDEX IF NOT EXISTS review_followups_send_queue_idx
  ON public.review_followups(send_at, invite_sent_at)
  WHERE invite_sent_at IS NULL AND is_refunded = false;

CREATE INDEX IF NOT EXISTS review_followups_reward_queue_idx
  ON public.review_followups(user_id, reward_claimed_at)
  WHERE reward_claimed_at IS NULL AND is_refunded = false;

CREATE INDEX IF NOT EXISTS review_followups_product_ids_gin_idx
  ON public.review_followups
  USING gin (purchased_product_ids);

CREATE TRIGGER update_review_followups_updated_at
  BEFORE UPDATE ON public.review_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reviews" ON public.product_reviews;
CREATE POLICY "Users can view their own reviews"
  ON public.product_reviews
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own customer reviews" ON public.product_reviews;
CREATE POLICY "Users can insert their own customer reviews"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND submission_source = 'customer'
    AND COALESCE(is_approved, false) = false
    AND moderation_status IN ('pending', 'rejected')
  );

DROP POLICY IF EXISTS "Users can update their own customer reviews" ON public.product_reviews;
CREATE POLICY "Users can update their own customer reviews"
  ON public.product_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND submission_source = 'customer'
    AND COALESCE(is_approved, false) = false
    AND moderation_status IN ('pending', 'rejected')
  );

DROP POLICY IF EXISTS "Service role manages product reviews" ON public.product_reviews;
CREATE POLICY "Service role manages product reviews"
  ON public.product_reviews
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view their own review followups" ON public.review_followups;
CREATE POLICY "Users can view their own review followups"
  ON public.review_followups
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages review followups" ON public.review_followups;
CREATE POLICY "Service role manages review followups"
  ON public.review_followups
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.review_followups IS
  'Tracks post-purchase review invitation emails and one-time review rewards per order.';

COMMENT ON COLUMN public.review_followups.purchased_product_ids IS
  'Expanded product UUIDs eligible for review from the originating order.';

COMMENT ON COLUMN public.product_reviews.submission_source IS
  'Origin of the review row: seed/script/admin/customer.';

COMMIT;
