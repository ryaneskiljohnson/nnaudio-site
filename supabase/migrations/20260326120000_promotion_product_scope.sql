-- @fileoverview Extend promotions with shop scope and per-product exclusions.
-- @module supabase/migrations/20260326120000_promotion_product_scope

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS product_scope TEXT NOT NULL DEFAULT 'subscriptions'
    CHECK (product_scope IN ('subscriptions', 'all'));

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS excluded_product_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.promotions.product_scope IS
  'subscriptions = plans in applicable_plans only; all = shop catalog (minus exclusions) plus those plans';
COMMENT ON COLUMN public.promotions.excluded_product_ids IS
  'public.products.id values excluded when product_scope is all';
