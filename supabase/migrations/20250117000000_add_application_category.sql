-- Add 'application' to product_category enum
-- This migration adds the 'application' category to the product_category enum type

DO $$ 
BEGIN
  -- Check if 'application' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'application' 
    AND enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'product_category'
    )
  ) THEN
    -- Add 'application' to the product_category enum
    ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'application';
  END IF;
END $$;
