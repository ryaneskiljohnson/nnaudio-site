-- Allow review_followups rows created from product_grants (free / NFR backfills).

BEGIN;

ALTER TABLE public.review_followups
  DROP CONSTRAINT IF EXISTS review_followups_purchase_source_check;

ALTER TABLE public.review_followups
  ADD CONSTRAINT review_followups_purchase_source_check
  CHECK (
    purchase_source IN (
      'payment_intent',
      'checkout_session',
      'bundle_lifetime',
      'bundle_subscription',
      'product_grant'
    )
  );

COMMIT;
