-- Add featured_image_url_png for NNAudio Access (macOS doesn't support WebP)
-- Web keeps using featured_image_url (WebP); NNAudio Access uses featured_image_url_png (PNG)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS featured_image_url_png TEXT;

COMMENT ON COLUMN products.featured_image_url_png IS 'PNG version of featured image for NNAudio Access (macOS WebP incompatibility)';
