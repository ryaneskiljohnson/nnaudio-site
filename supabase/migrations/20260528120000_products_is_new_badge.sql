-- Add toggleable "New" badge flag for products (shown on catalog cards).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_new IS
  'When true, shows a New badge on product cards and related catalog surfaces.';

-- Default launch products
UPDATE public.products
SET is_new = true
WHERE slug IN ('cymasphere', 'cymasynth', 'plugin-play');
