-- Migration: Create product_grants table for free product licenses
-- This allows granting individual products to users without Stripe purchases

-- Create product_grants table
CREATE TABLE IF NOT EXISTS public.product_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_grants_user_email ON public.product_grants(user_email);
CREATE INDEX IF NOT EXISTS idx_product_grants_product_id ON public.product_grants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_grants_user_product ON public.product_grants(user_email, product_id);

-- Add unique constraint to prevent duplicate grants
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_grants_unique ON public.product_grants(user_email, product_id);

-- Add comments
COMMENT ON TABLE public.product_grants IS 'Tracks free product licenses granted to users (NFR/comp products)';
COMMENT ON COLUMN public.product_grants.user_email IS 'Email of the user receiving the grant';
COMMENT ON COLUMN public.product_grants.product_id IS 'Product being granted';
COMMENT ON COLUMN public.product_grants.granted_at IS 'When the product was granted';
COMMENT ON COLUMN public.product_grants.granted_by IS 'Admin user who granted the product';
COMMENT ON COLUMN public.product_grants.notes IS 'Optional notes about the grant';

-- Enable Row Level Security
ALTER TABLE public.product_grants ENABLE ROW LEVEL SECURITY;

-- Admin policy: Admins can manage all grants
CREATE POLICY "Admins can manage product_grants" ON public.product_grants
  FOR ALL
  USING (is_admin(auth.uid()));

-- User policy: Users can view their own grants
CREATE POLICY "Users can view their own product_grants" ON public.product_grants
  FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

