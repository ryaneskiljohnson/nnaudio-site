-- Migration: Add status field to resellers table
-- This allows suspending or deleting resellers, which prevents new code redemptions
-- Already redeemed codes remain valid

-- Create reseller status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reseller_status') THEN
    CREATE TYPE reseller_status AS ENUM ('active', 'suspended', 'deleted');
  END IF;
END $$;

-- Add status column to resellers table
ALTER TABLE public.resellers 
ADD COLUMN IF NOT EXISTS status reseller_status DEFAULT 'active' NOT NULL;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_resellers_status ON public.resellers(status) WHERE status != 'active';

-- Add comment
COMMENT ON COLUMN public.resellers.status IS 'Status of the reseller: active (codes can be redeemed), suspended (codes cannot be redeemed), deleted (soft delete, codes cannot be redeemed)';

-- Update existing resellers to active status (if any exist)
UPDATE public.resellers SET status = 'active' WHERE status IS NULL;
