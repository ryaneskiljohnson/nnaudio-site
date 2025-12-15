-- Create bundles system for subscription tiers
-- This migration creates tables for bundles, bundle products, and bundle subscription pricing

-- Bundles table
CREATE TABLE IF NOT EXISTS public.bundles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Basic info
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
  short_description TEXT,
  
  -- Bundle type/category
  bundle_type TEXT NOT NULL CHECK (bundle_type IN ('ultimate', 'plugins', 'midi_loops', 'presets', 'templates', 'custom')),
  
  -- Visual
  featured_image_url TEXT,
  logo_url TEXT,
  background_image_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  
  -- Display order
  display_order INTEGER DEFAULT 0,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[]
);

-- Bundle products junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.bundle_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Display order within bundle
  display_order INTEGER DEFAULT 0,
  
  UNIQUE(bundle_id, product_id)
);

-- Bundle subscription tiers (pricing for each bundle)
CREATE TABLE IF NOT EXISTS public.bundle_subscription_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  
  -- Subscription type
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'annual', 'lifetime')),
  
  -- Pricing
  price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2),
  
  -- Stripe integration
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  UNIQUE(bundle_id, subscription_type)
);

-- Create indexes
CREATE INDEX idx_bundles_status ON public.bundles(status);
CREATE INDEX idx_bundles_type ON public.bundles(bundle_type);
CREATE INDEX idx_bundles_featured ON public.bundles(is_featured) WHERE is_featured = true;
CREATE INDEX idx_bundle_products_bundle ON public.bundle_products(bundle_id);
CREATE INDEX idx_bundle_products_product ON public.bundle_products(product_id);
CREATE INDEX idx_bundle_tiers_bundle ON public.bundle_subscription_tiers(bundle_id);
CREATE INDEX idx_bundle_tiers_type ON public.bundle_subscription_tiers(subscription_type);
CREATE INDEX idx_bundle_tiers_active ON public.bundle_subscription_tiers(active) WHERE active = true;

-- Enable RLS
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_subscription_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bundles
CREATE POLICY "Anyone can view active bundles"
  ON public.bundles
  FOR SELECT
  USING (status = 'active');

-- RLS Policies for bundle_products
CREATE POLICY "Anyone can view bundle products for active bundles"
  ON public.bundle_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bundles
      WHERE bundles.id = bundle_products.bundle_id
      AND bundles.status = 'active'
    )
  );

-- RLS Policies for bundle_subscription_tiers
CREATE POLICY "Anyone can view active bundle subscription tiers"
  ON public.bundle_subscription_tiers
  FOR SELECT
  USING (active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bundle_tiers_updated_at
  BEFORE UPDATE ON public.bundle_subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate bundle total value
CREATE OR REPLACE FUNCTION get_bundle_total_value(bundle_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_value NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.sale_price IS NOT NULL AND p.sale_price > 0 THEN p.sale_price
      ELSE p.price
    END
  ), 0)
  INTO total_value
  FROM public.bundle_products bp
  JOIN public.products p ON bp.product_id = p.id
  WHERE bp.bundle_id = bundle_uuid
  AND p.status = 'active';
  
  RETURN total_value;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.bundles IS 'Product bundles that can be purchased via subscription tiers';
COMMENT ON TABLE public.bundle_products IS 'Junction table linking bundles to products';
COMMENT ON TABLE public.bundle_subscription_tiers IS 'Subscription pricing tiers for bundles (monthly, annual, lifetime)';
COMMENT ON COLUMN public.bundles.bundle_type IS 'Type of bundle: ultimate (all products), plugins (all plugins), midi_loops (all MIDI/loops), etc.';

