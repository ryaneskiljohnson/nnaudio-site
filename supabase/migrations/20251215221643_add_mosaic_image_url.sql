-- Add mosaic_image_url column to bundles table
ALTER TABLE public.bundles 
ADD COLUMN IF NOT EXISTS mosaic_image_url TEXT;
