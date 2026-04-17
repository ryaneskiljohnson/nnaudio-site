-- @fileoverview Adds stable auth user link to product_grants for email-change resilience.
-- @module supabase/migrations/20260416100000_product_grants_add_user_id
-- @note Apply with your normal workflow (do not db reset).

ALTER TABLE public.product_grants
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_grants_user_id
  ON public.product_grants(user_id);

UPDATE public.product_grants pg
  SET user_id = u.id
  FROM auth.users u
  WHERE pg.user_id IS NULL
    AND lower(u.email) = lower(pg.user_email);

-- Collapse duplicate (user_id, product_id) rows from case-variant emails before unique index
DELETE FROM public.product_grants pg
WHERE pg.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, product_id
        ORDER BY granted_at DESC NULLS LAST, created_at DESC NULLS LAST
      ) AS rn
    FROM public.product_grants
    WHERE user_id IS NOT NULL
  ) t
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_grants_user_id_product
  ON public.product_grants(user_id, product_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.product_grants
  DROP CONSTRAINT IF EXISTS product_grants_user_id_or_email_chk;

ALTER TABLE public.product_grants
  ADD CONSTRAINT product_grants_user_id_or_email_chk
  CHECK (user_id IS NOT NULL OR user_email IS NOT NULL);

COMMENT ON COLUMN public.product_grants.user_id IS 'Supabase auth user id; canonical link when set (survives email changes)';
