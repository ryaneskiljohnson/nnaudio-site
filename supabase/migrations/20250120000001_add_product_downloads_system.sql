-- Migration: Add product downloads system with Supabase Storage support
-- This enables secure, scalable download management with signed URLs

-- Add downloads JSON field to products table
-- Structure: Array of download objects with:
--   - path: Storage path in product-downloads bucket
--   - name: Display name
--   - type: download type (plugin, samples, docs, midi, loops, kit)
--   - version: Optional version string
--   - file_size: File size in bytes
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS downloads JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN products.downloads IS 'Array of download objects. Each object has: path (storage path), name (display name), type (plugin|samples|docs|midi|loops|kit), version (optional), file_size (bytes)';

-- Create index for faster queries on downloads
CREATE INDEX IF NOT EXISTS idx_products_downloads ON products USING GIN (downloads);

-- Note: Storage bucket 'product-downloads' should be created via Supabase dashboard or API
-- The bucket should be private (not public) for security
-- Signed URLs will be generated via API endpoint


