-- Add 'midi-fx-plugin' to product_category enum
-- This migration adds the 'midi-fx-plugin' category to the product_category enum type

DO $$ 
BEGIN
  -- Check if 'midi-fx-plugin' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'midi-fx-plugin' 
    AND enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'product_category'
    )
  ) THEN
    -- Add 'midi-fx-plugin' to the product_category enum
    ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'midi-fx-plugin';
  END IF;
END $$;
