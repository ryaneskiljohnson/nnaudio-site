-- @fileoverview Adds promotions targeting columns if missing (fixes PostgREST "included_targets not in schema cache").
-- @note Safe when 20260326200000 was never applied on the linked project. Idempotent (IF NOT EXISTS).

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS promotion_target_mode TEXT NOT NULL DEFAULT 'selected'
    CHECK (promotion_target_mode IN ('all', 'selected'));

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS included_targets TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.promotions.promotion_target_mode IS
  'all = every offer; selected = only keys in included_targets';
COMMENT ON COLUMN public.promotions.included_targets IS
  'Keys: product:<uuid>, product:<uuid>:tier, bundle:<uuid>:tier';
