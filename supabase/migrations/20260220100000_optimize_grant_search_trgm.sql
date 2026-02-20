-- Migration: Add pg_trgm GIN indexes for fast LIKE '%term%' search in admin grant orders
-- Enables indexed search on product_grants.user_email and products.name used by get_admin_grant_orders_paginated

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for product_grants.user_email (search by email in admin orders)
CREATE INDEX IF NOT EXISTS idx_product_grants_email_trgm
  ON public.product_grants USING GIN (user_email gin_trgm_ops);

-- Trigram index for products.name (search by product name in admin orders)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING GIN (name gin_trgm_ops);
