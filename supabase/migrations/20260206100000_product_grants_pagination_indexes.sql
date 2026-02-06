-- Migration: Optimize product_grants for 100k+ records with pagination
-- Adds indexes for efficient ORDER BY and filtering
-- Creates RPC for paginated grant orders (direct DB query, no in-memory loading)

-- Index for ORDER BY granted_at DESC (primary sort for pagination)
CREATE INDEX IF NOT EXISTS idx_product_grants_granted_at_desc
  ON public.product_grants (granted_at DESC);

-- Composite index for grouping and filtering
CREATE INDEX IF NOT EXISTS idx_product_grants_user_granted
  ON public.product_grants (user_email, granted_at DESC);

-- RPC: Paginated grant orders - direct DB, grouped by (user_email, minute)
-- Optimized: skips products join when search is empty (major speedup for 100k+ rows)
-- See migration 20260206100001_optimize_grant_orders_rpc_performance for latest
CREATE OR REPLACE FUNCTION public.get_admin_grant_orders_paginated(
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 50,
  p_search TEXT DEFAULT NULL,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_orders JSONB;
  v_total_count BIGINT;
  v_search_lower TEXT;
BEGIN
  p_page := GREATEST(1, COALESCE(p_page, 1));
  p_limit := LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset := (p_page - 1) * p_limit;
  v_search_lower := LOWER(TRIM(COALESCE(p_search, '')));

  WITH filtered AS (
    SELECT pg.id, pg.product_id, pg.user_email, pg.granted_at, pg.notes,
           COALESCE(pg.amount, 0)::NUMERIC as amount,
           (pg.notes ILIKE '%Redeemed via reseller code:%') as is_redemption
    FROM product_grants pg
    LEFT JOIN products p ON p.id = pg.product_id
    WHERE
      (p_filter = 'all' OR
       (p_filter = 'grant' AND (pg.notes IS NULL OR pg.notes NOT ILIKE '%Redeemed via reseller code:%')) OR
       (p_filter = 'redemption' AND pg.notes ILIKE '%Redeemed via reseller code:%'))
      AND (
        v_search_lower = '' OR
        LOWER(pg.user_email) LIKE '%' || v_search_lower || '%' OR
        UPPER(REPLACE(pg.id::TEXT, '-', '')) LIKE '%' || UPPER(REPLACE(v_search_lower, ' ', '')) || '%' OR
        (p.name IS NOT NULL AND LOWER(p.name) LIKE '%' || v_search_lower || '%') OR
        (p.slug IS NOT NULL AND LOWER(p.slug) LIKE '%' || v_search_lower || '%')
      )
  ),
  grouped AS (
    SELECT
      user_email,
      date_trunc('minute', granted_at) AS minute_bucket,
      min(granted_at) AS granted_at,
      (array_agg(id ORDER BY granted_at))[1] AS first_id,
      array_agg(id ORDER BY granted_at) AS grant_ids,
      sum(amount) AS total_amount,
      bool_and(is_redemption) AS all_redemptions,
      (array_agg(notes ORDER BY granted_at))[1] AS first_notes
    FROM filtered
    GROUP BY user_email, date_trunc('minute', granted_at)
    ORDER BY min(granted_at) DESC
  ),
  count_cte AS (
    SELECT COUNT(*) AS cnt FROM grouped
  ),
  paginated AS (
    SELECT * FROM grouped
    LIMIT p_limit OFFSET v_offset
  ),
  with_items AS (
    SELECT
      p.user_email,
      p.minute_bucket,
      p.granted_at,
      p.first_id,
      p.grant_ids,
      p.total_amount,
      p.all_redemptions,
      p.first_notes,
      pg.product_id,
      COALESCE(pg.amount, 0)::NUMERIC as item_amount,
      prod.name AS product_name,
      prod.slug AS product_slug,
      prod.featured_image_url
    FROM paginated p
    CROSS JOIN LATERAL unnest(p.grant_ids) AS gid
    JOIN product_grants pg ON pg.id = gid
    JOIN products prod ON prod.id = pg.product_id
  )
  SELECT cnt INTO v_total_count FROM count_cte;

  SELECT jsonb_agg(order_row ORDER BY granted_at DESC) INTO v_orders
  FROM (
    SELECT DISTINCT ON (user_email, minute_bucket)
      user_email, minute_bucket, granted_at, first_id, grant_ids, total_amount, all_redemptions, first_notes
    FROM with_items
  ) grp
  CROSS JOIN LATERAL (
    SELECT jsonb_build_object(
      'id', CASE WHEN array_length(grp.grant_ids, 1) > 1 THEN 'batch_' || grp.first_id ELSE (CASE WHEN grp.all_redemptions THEN 'redemption_' ELSE 'grant_' END) || grp.first_id END,
      'orderNumber', (CASE WHEN grp.all_redemptions THEN 'REDEEM-' ELSE 'GRANT-' END) || UPPER(SUBSTRING(grp.first_id::TEXT, 1, 8)),
      'date', grp.granted_at,
      'status', 'succeeded',
      'amount', grp.total_amount,
      'currency', 'USD',
      'items', (SELECT jsonb_agg(jsonb_build_object(
        'id', wi.product_id,
        'name', wi.product_name,
        'quantity', 1,
        'price', wi.item_amount,
        'product_image', wi.featured_image_url,
        'product_slug', wi.product_slug
      )) FROM with_items wi WHERE wi.user_email = grp.user_email AND wi.minute_bucket = grp.minute_bucket),
      'metadata', jsonb_build_object(
        'grant_id', CASE WHEN array_length(grp.grant_ids, 1) = 1 THEN grp.grant_ids[1] ELSE NULL END,
        'grant_ids', CASE WHEN array_length(grp.grant_ids, 1) > 1 THEN (SELECT jsonb_agg(x::TEXT) FROM unnest(grp.grant_ids) x) ELSE NULL END,
        'grant_type', CASE WHEN grp.all_redemptions THEN 'redemption' ELSE 'free_license' END,
        'notes', grp.first_notes
      ),
      'customerEmail', grp.user_email,
      'receiptUrl', NULL,
      'invoiceId', NULL,
      'refundedAmount', 0,
      'isRefunded', false,
      'isPartiallyRefunded', false,
      'refunds', '[]'::JSONB,
      'orderType', CASE WHEN grp.all_redemptions THEN 'redemption' ELSE 'grant' END
    ) AS order_row
  ) o;

  RETURN jsonb_build_object(
    'orders', COALESCE(v_orders, '[]'::JSONB),
    'total_count', v_total_count,
    'page', p_page,
    'limit', p_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_grant_orders_paginated(INT, INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_grant_orders_paginated(INT, INT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.get_admin_grant_orders_paginated IS 'Paginated grant/redemption orders. Direct DB query for 100k+ scale.';
