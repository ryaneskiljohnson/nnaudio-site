-- Add Stripe integration fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_sale_price_id TEXT;

-- Create index on stripe_product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON public.products(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_id ON public.products(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.products.stripe_product_id IS 'Stripe product ID for this product';
COMMENT ON COLUMN public.products.stripe_price_id IS 'Stripe price ID for the regular price';
COMMENT ON COLUMN public.products.stripe_sale_price_id IS 'Stripe price ID for the sale price (if on sale)';

