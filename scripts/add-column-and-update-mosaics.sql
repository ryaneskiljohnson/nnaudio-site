-- Add the mosaic_image_url column
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS mosaic_image_url TEXT;

-- Update bundles with their mosaic URLs (you'll need to replace these with actual URLs from the check script)
-- The script will output the actual URLs after checking
