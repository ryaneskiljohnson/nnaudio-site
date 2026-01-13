-- Migration: Create resellers and reseller_codes tables
-- This system allows creating redeemable serial codes for resellers
-- Resellers can distribute codes that users can redeem on the nnaudio site

-- Create resellers table
CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  contact_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reseller_codes table
CREATE TABLE IF NOT EXISTS public.reseller_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  serial_code TEXT NOT NULL UNIQUE,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reseller_codes_reseller_id ON public.reseller_codes(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_codes_product_id ON public.reseller_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_reseller_codes_serial_code ON public.reseller_codes(serial_code);
CREATE INDEX IF NOT EXISTS idx_reseller_codes_redeemed ON public.reseller_codes(redeemed_at) WHERE redeemed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reseller_codes_redeemed_by ON public.reseller_codes(redeemed_by_user_id) WHERE redeemed_by_user_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE public.resellers IS 'Reseller partners who distribute product codes';
COMMENT ON COLUMN public.resellers.name IS 'Name of the reseller';
COMMENT ON COLUMN public.resellers.email IS 'Contact email for the reseller';
COMMENT ON COLUMN public.resellers.contact_info IS 'Additional contact information';
COMMENT ON COLUMN public.resellers.notes IS 'Optional notes about the reseller';

COMMENT ON TABLE public.reseller_codes IS 'Serial codes for products distributed by resellers';
COMMENT ON COLUMN public.reseller_codes.reseller_id IS 'Reseller who owns this code';
COMMENT ON COLUMN public.reseller_codes.product_id IS 'Product this code redeems';
COMMENT ON COLUMN public.reseller_codes.serial_code IS 'Unique serial code for redemption';
COMMENT ON COLUMN public.reseller_codes.redeemed_at IS 'When the code was redeemed (NULL if unused)';
COMMENT ON COLUMN public.reseller_codes.redeemed_by_user_id IS 'User who redeemed this code';

-- Enable Row Level Security
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_codes ENABLE ROW LEVEL SECURITY;

-- Admin policies: Admins can manage all resellers and codes
CREATE POLICY "Admins can manage resellers" ON public.resellers
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage reseller_codes" ON public.reseller_codes
  FOR ALL
  USING (is_admin(auth.uid()));

-- User policy: Users can view their own redeemed codes
CREATE POLICY "Users can view their own redeemed codes" ON public.reseller_codes
  FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND redeemed_by_user_id = auth.uid()
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resellers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reseller_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW
  EXECUTE FUNCTION update_resellers_updated_at();

CREATE TRIGGER update_reseller_codes_updated_at
  BEFORE UPDATE ON public.reseller_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_reseller_codes_updated_at();
