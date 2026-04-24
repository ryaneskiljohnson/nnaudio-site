-- @fileoverview Backfill public.reseller_codes for ADSR reseller so every **active** product
--   with `category` not `bundle` has up to 50 unredeemed rows (12-char pool matches app: no I,O,0,1 in charset).
--   Idempotent: only inserts when count < 50 for that (reseller, product). Safe to re-run.
--   Apply: `bunx supabase db push` (or run this file in the Supabase SQL editor).

SET lock_timeout = '5min';

DO $$
DECLARE
  v_adsr constant uuid := '2917f0f3-c5b5-413b-8122-b5cae8383a16';
  v_per_product constant int := 50;
  v_alph text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  p record;
  need int;
  n int;
  s text;
  ch int;
  k int;
  i int;
BEGIN
  FOR p IN
    SELECT
      pr.id,
      GREATEST(0, v_per_product - COALESCE(t.cnt, 0))::int AS need
    FROM public.products pr
    LEFT JOIN (
      SELECT
        product_id,
        count(*)::bigint AS cnt
      FROM public.reseller_codes
      WHERE reseller_id = v_adsr
      GROUP BY product_id
    ) t ON t.product_id = pr.id
    WHERE pr.status = 'active'
      AND (pr.category IS NULL OR pr.category::text IS DISTINCT FROM 'bundle')
  LOOP
    n := 0;
    k := 0;
    need := p.need;
    IF need <= 0 THEN
      CONTINUE;
    END IF;
    WHILE n < need LOOP
      s := '';
      FOR i IN 1..12 LOOP
        ch := 1 + (floor(random() * 32))::int;
        s := s || substr(v_alph, ch, 1);
      END LOOP;
      k := k + 1;
      IF k > need * 50 THEN
        RAISE EXCEPTION
          'Could not generate enough unique ADSR serials for product % after % attempts',
          p.id,
          k;
      END IF;
      IF EXISTS (SELECT 1 FROM public.reseller_codes r WHERE r.serial_code = s) THEN
        CONTINUE;
      END IF;
      BEGIN
        INSERT INTO public.reseller_codes (id, reseller_id, product_id, serial_code)
        VALUES (gen_random_uuid(), v_adsr, p.id, s);
        n := n + 1;
      EXCEPTION
        WHEN unique_violation THEN
          -- collision on serial_code or (reseller, product) unique if any
          NULL;
      END;
    END LOOP;
  END LOOP;
END;
$$;
