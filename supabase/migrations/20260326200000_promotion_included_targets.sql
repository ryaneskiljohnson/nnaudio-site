-- @fileoverview Include-all vs explicit promotion targets (plans, products, bundle tiers).
-- @module supabase/migrations/20260326200000_promotion_included_targets

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS promotion_target_mode TEXT NOT NULL DEFAULT 'selected'
    CHECK (promotion_target_mode IN ('all', 'selected'));

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS included_targets TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.promotions.promotion_target_mode IS
  'all = every offer; selected = only keys in included_targets';
COMMENT ON COLUMN public.promotions.included_targets IS
  'Keys: plan:monthly|annual|lifetime, product:<uuid>, bundle:<bundle_uuid>:monthly|annual|lifetime';

-- 1) Everyone starts as selected with Cymasphere plan keys from applicable_plans
UPDATE public.promotions p
SET
  promotion_target_mode = 'selected',
  included_targets = COALESCE(
    (
      SELECT array_agg('plan:' || x ORDER BY x)
      FROM unnest(COALESCE(p.applicable_plans, ARRAY[]::text[])) AS t(x)
      WHERE x IN ('monthly', 'annual', 'lifetime')
    ),
    '{}'
  );

-- 2) Legacy “whole catalog” promos → include all
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'promotions'
      AND column_name = 'product_scope'
  ) THEN
    UPDATE public.promotions
    SET promotion_target_mode = 'all', included_targets = '{}'
    WHERE product_scope = 'all'
      AND (
        excluded_product_ids IS NULL
        OR cardinality(excluded_product_ids) = 0
      );

    ALTER TABLE public.promotions DROP COLUMN IF EXISTS product_scope;
    ALTER TABLE public.promotions DROP COLUMN IF EXISTS excluded_product_ids;
  END IF;
END $$;
