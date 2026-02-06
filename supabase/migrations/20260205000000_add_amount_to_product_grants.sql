-- Migration: Add amount to product_grants for historical order records
-- Allows recording actual transaction amounts for grants (NFR, comp, etc.)
-- even though no Stripe transaction occurred.

ALTER TABLE public.product_grants
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.product_grants.amount IS 'Recorded transaction amount for historical/accounting purposes (USD)';
