-- @fileoverview Binds product_grants and user_management (NFR) to auth user_id so access survives email changes.
-- @note Keeps user_email on both tables as a denormalized lowercase copy for admin search; sync_profile_email_on_auth_update updates it when auth email changes.

-- ---------------------------------------------------------------------------
-- 1) product_grants: add user_id, backfill, enforce uniqueness by user + product
-- ---------------------------------------------------------------------------

ALTER TABLE public.product_grants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.product_grants pg
SET user_id = au.id
FROM auth.users au
WHERE pg.user_id IS NULL
  AND au.email IS NOT NULL
  AND lower(trim(au.email::text)) = lower(trim(pg.user_email));

UPDATE public.product_grants pg
SET user_id = p.id
FROM public.profiles p
WHERE pg.user_id IS NULL
  AND p.email IS NOT NULL
  AND lower(trim(p.email::text)) = lower(trim(pg.user_email));

DO $$
DECLARE
  orphan_count int;
BEGIN
  SELECT count(*)::int INTO orphan_count FROM public.product_grants WHERE user_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      USING MESSAGE = format(
        'Migration stopped: %s product_grants rows have no matching auth user (user_id still NULL). Fix or remove them, then re-run.',
        orphan_count
      );
  END IF;
END $$;

ALTER TABLE public.product_grants
  ALTER COLUMN user_id SET NOT NULL;

-- Keep one grant row per (user_id, product_id) before adding the unique index
DELETE FROM public.product_grants pg
WHERE pg.id IN (
  SELECT id FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY user_id, product_id
        ORDER BY granted_at DESC NULLS LAST, created_at DESC NULLS LAST
      ) AS rn
    FROM public.product_grants
  ) d
  WHERE d.rn > 1
);

DROP INDEX IF EXISTS public.idx_product_grants_unique;
DROP INDEX IF EXISTS public.idx_product_grants_user_email;
DROP INDEX IF EXISTS public.idx_product_grants_user_product;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_grants_user_id_product_id
  ON public.product_grants (user_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_grants_user_id_granted
  ON public.product_grants (user_id, granted_at DESC);

DROP POLICY IF EXISTS "Users can view their own product_grants" ON public.product_grants;

CREATE POLICY "Users can view their own product_grants" ON public.product_grants
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 2) user_management: replace email PK with user_id PK + denormalized user_email
-- ---------------------------------------------------------------------------

CREATE TABLE public.user_management_new (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  pro BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE public.user_management_new IS 'Manual NFR / pro flags per auth user. user_email is denormalized (lowercase) for admin UI and search; updated when auth email changes.';
COMMENT ON COLUMN public.user_management_new.user_id IS 'Supabase auth user id (source of truth for NFR row).';
COMMENT ON COLUMN public.user_management_new.user_email IS 'Lowercased email mirror of auth.users.email for admin listing and search.';

INSERT INTO public.user_management_new (user_id, user_email, pro, notes, active)
SELECT
  au.id,
  lower(trim(au.email::text)),
  um.pro,
  um.notes,
  COALESCE(um.active, true)
FROM public.user_management um
INNER JOIN auth.users au
  ON lower(trim(au.email::text)) = lower(trim(um.user_email));

DROP POLICY IF EXISTS "Users can view their own user_management" ON public.user_management;
DROP POLICY IF EXISTS "Admins can manage user_management" ON public.user_management;

DROP TABLE public.user_management;

ALTER TABLE public.user_management_new RENAME TO user_management;

CREATE INDEX IF NOT EXISTS idx_user_management_user_email ON public.user_management (user_email);

ALTER TABLE public.user_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_management" ON public.user_management
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own user_management" ON public.user_management
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 3) Keep denormalized emails in sync when auth.users.email changes (single trigger)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_profile_email_on_auth_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL THEN
    UPDATE public.profiles
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;

    UPDATE public.product_grants
    SET user_email = lower(trim(NEW.email::text)), updated_at = NOW()
    WHERE user_id = NEW.id;

    UPDATE public.user_management
    SET user_email = lower(trim(NEW.email::text))
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Paginated grant orders RPC: group by user_id; expose email via auth.users
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_grant_orders_paginated(
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 50,
  p_search TEXT DEFAULT NULL,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
    SELECT
      pg.id,
      pg.product_id,
      pg.user_id,
      pg.granted_at,
      pg.notes,
      COALESCE(pg.amount, 0)::NUMERIC AS amount,
      lower(trim(COALESCE(au.email::text, pg.user_email))) AS grantee_email,
      (pg.notes ILIKE '%Redeemed via reseller code:%') AS is_redemption
    FROM public.product_grants pg
    LEFT JOIN auth.users au ON au.id = pg.user_id
    LEFT JOIN public.products p ON p.id = pg.product_id
    WHERE
      (p_filter = 'all' OR
       (p_filter = 'grant' AND (pg.notes IS NULL OR pg.notes NOT ILIKE '%Redeemed via reseller code:%')) OR
       (p_filter = 'redemption' AND pg.notes ILIKE '%Redeemed via reseller code:%'))
      AND (
        v_search_lower = '' OR
        LOWER(COALESCE(au.email::text, pg.user_email)) LIKE '%' || v_search_lower || '%' OR
        LOWER(pg.user_email) LIKE '%' || v_search_lower || '%' OR
        UPPER(REPLACE(pg.id::TEXT, '-', '')) LIKE '%' || UPPER(REPLACE(v_search_lower, ' ', '')) || '%' OR
        (p.name IS NOT NULL AND LOWER(p.name) LIKE '%' || v_search_lower || '%') OR
        (p.slug IS NOT NULL AND LOWER(p.slug) LIKE '%' || v_search_lower || '%')
      )
  ),
  grouped AS (
    SELECT
      user_id,
      date_trunc('minute', granted_at) AS minute_bucket,
      min(granted_at) AS granted_at,
      (array_agg(grantee_email ORDER BY granted_at))[1] AS grantee_email,
      (array_agg(id ORDER BY granted_at))[1] AS first_id,
      array_agg(id ORDER BY granted_at) AS grant_ids,
      sum(amount) AS total_amount,
      bool_and(is_redemption) AS all_redemptions,
      (array_agg(notes ORDER BY granted_at))[1] AS first_notes
    FROM filtered
    GROUP BY user_id, date_trunc('minute', granted_at)
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
      p.user_id,
      p.minute_bucket,
      p.granted_at,
      p.first_id,
      p.grant_ids,
      p.total_amount,
      p.all_redemptions,
      p.first_notes,
      p.grantee_email,
      pg.product_id,
      COALESCE(pg.amount, 0)::NUMERIC AS item_amount,
      prod.name AS product_name,
      prod.slug AS product_slug,
      prod.featured_image_url
    FROM paginated p
    CROSS JOIN LATERAL unnest(p.grant_ids) AS gid
    JOIN public.product_grants pg ON pg.id = gid
    JOIN public.products prod ON prod.id = pg.product_id
  )
  SELECT cnt INTO v_total_count FROM count_cte;

  SELECT jsonb_agg(order_row ORDER BY granted_at DESC) INTO v_orders
  FROM (
    SELECT DISTINCT ON (user_id, minute_bucket)
      user_id, minute_bucket, granted_at, first_id, grant_ids, total_amount, all_redemptions, first_notes, grantee_email
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
      )) FROM with_items wi WHERE wi.user_id = grp.user_id AND wi.minute_bucket = grp.minute_bucket),
      'metadata', jsonb_build_object(
        'grant_id', CASE WHEN array_length(grp.grant_ids, 1) = 1 THEN grp.grant_ids[1] ELSE NULL END,
        'grant_ids', CASE WHEN array_length(grp.grant_ids, 1) > 1 THEN (SELECT jsonb_agg(x::TEXT) FROM unnest(grp.grant_ids) x) ELSE NULL END,
        'grant_type', CASE WHEN grp.all_redemptions THEN 'redemption' ELSE 'free_license' END,
        'notes', grp.first_notes
      ),
      'customerEmail', grp.grantee_email,
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

COMMENT ON FUNCTION public.get_admin_grant_orders_paginated IS 'Paginated grant/redemption orders grouped by auth user_id; customerEmail from auth.users.';
