-- @fileoverview Product subscription Stripe tiers JSONB; drop promotion Cymasphere-only columns.
-- @module supabase/migrations/20260327120000_product_subscription_promo_cleanup

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subscription_stripe_prices JSONB DEFAULT NULL;

COMMENT ON COLUMN public.products.subscription_stripe_prices IS
  'Optional per-tier checkout: {"monthly":{"stripe_price_id":"price_...","list_price":6}, "annual":{...}, "lifetime":{...}}. Missing stripe_price_id falls back to env in app.';

-- Default list prices for membership product (Stripe IDs filled via dashboard or env fallback in code)
UPDATE public.products p
SET subscription_stripe_prices = jsonb_build_object(
  'monthly', jsonb_build_object('list_price', 6),
  'annual', jsonb_build_object('list_price', 59),
  'lifetime', jsonb_build_object('list_price', 149)
)
WHERE p.slug = 'cymasphere'
  AND (p.subscription_stripe_prices IS NULL OR p.subscription_stripe_prices = '{}'::jsonb);

-- Map legacy plan:* promotion targets to product:<cymasphere_uuid>:tier
DO $$
DECLARE
  cid uuid;
BEGIN
  SELECT id INTO cid FROM public.products WHERE slug = 'cymasphere' LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'No product slug=cymasphere; skip plan:* target migration';
    RETURN;
  END IF;

  UPDATE public.promotions p
  SET included_targets = COALESCE(
    (
      SELECT array_agg(
        CASE
          WHEN x = 'plan:monthly' THEN 'product:' || cid::text || ':monthly'
          WHEN x = 'plan:annual' THEN 'product:' || cid::text || ':annual'
          WHEN x = 'plan:lifetime' THEN 'product:' || cid::text || ':lifetime'
          ELSE x
        END
        ORDER BY ord
      )
      FROM unnest(COALESCE(p.included_targets, ARRAY[]::text[])) WITH ORDINALITY AS t(x, ord)
    ),
    '{}'
  )
  WHERE EXISTS (
    SELECT 1 FROM unnest(COALESCE(p.included_targets, ARRAY[]::text[])) AS u(v)
    WHERE v LIKE 'plan:%'
  );
END $$;

ALTER TABLE public.promotions DROP COLUMN IF EXISTS applicable_plans;
ALTER TABLE public.promotions DROP COLUMN IF EXISTS sale_price_monthly;
ALTER TABLE public.promotions DROP COLUMN IF EXISTS sale_price_annual;
ALTER TABLE public.promotions DROP COLUMN IF EXISTS sale_price_lifetime;

DROP FUNCTION IF EXISTS public.get_active_promotion(text);
