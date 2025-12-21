-- Migration: Add legacy product ID field for plugin authorization
-- This allows plugins to use the old numeric product IDs from WooCommerce
-- instead of requiring UUID changes in plugin code

-- Add legacy_product_id field to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS legacy_product_id TEXT;

-- Create index on legacy_product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_legacy_product_id ON public.products(legacy_product_id) WHERE legacy_product_id IS NOT NULL;

-- Add unique constraint to ensure no duplicate legacy IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_legacy_product_id_unique ON public.products(legacy_product_id) WHERE legacy_product_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.products.legacy_product_id IS 'Legacy product ID from old WooCommerce system (numeric string). Used by plugins for authorization instead of UUID.';

