-- One-time backfill: mark all existing product reviews as approved so they appear on product pages.
-- New reviews will continue to start as pending and be approved via the admin reviews page.

UPDATE public.product_reviews
SET moderation_status = 'approved', is_approved = true
WHERE moderation_status IS DISTINCT FROM 'approved'
   OR is_approved IS NOT TRUE;
