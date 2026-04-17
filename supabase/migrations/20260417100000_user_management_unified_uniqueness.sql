-- @fileoverview Merges duplicate user_management rows (user_id row + email-only row for same auth email),
--   then replaces partial unique indexes with one expression unique index.
-- @module supabase/migrations/20260417100000_user_management_unified_uniqueness
-- @note Apply with your normal workflow (do not db reset).

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_management_merge_audit (
  merged_at   timestamptz NOT NULL DEFAULT now(),
  kept_id     uuid        NOT NULL,
  dropped_id  uuid        NOT NULL,
  user_id     uuid,
  user_email  text
);

WITH pairs AS (
  SELECT
    keep.id AS keep_id,
    drop_row.id AS drop_id,
    keep.user_id AS user_id,
    drop_row.user_email AS old_email,
    (keep.pro OR drop_row.pro) AS merged_pro,
    (keep.active OR drop_row.active) AS merged_active,
    NULLIF(
      concat_ws(
        E'\n---\n',
        NULLIF(keep.notes, ''),
        NULLIF(drop_row.notes, '')
      ),
      ''
    ) AS merged_notes
  FROM public.user_management keep
  JOIN auth.users u ON u.id = keep.user_id
  JOIN public.user_management drop_row
    ON drop_row.user_id IS NULL
   AND lower(drop_row.user_email) = lower(u.email)
  WHERE keep.user_id IS NOT NULL
),
upd AS (
  UPDATE public.user_management um
  SET pro    = p.merged_pro,
      active = p.merged_active,
      notes  = p.merged_notes
  FROM pairs p
  WHERE um.id = p.keep_id
  RETURNING um.id
),
logged AS (
  INSERT INTO public.user_management_merge_audit
    (kept_id, dropped_id, user_id, user_email)
  SELECT keep_id, drop_id, user_id, old_email FROM pairs
  RETURNING kept_id
)
DELETE FROM public.user_management um
USING pairs p
WHERE um.id = p.drop_id;

DROP INDEX IF EXISTS public.idx_user_management_user_id;
DROP INDEX IF EXISTS public.idx_user_management_user_email_ci;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_management_user_key
  ON public.user_management
  ((coalesce(user_id::text, lower(user_email))));

COMMIT;

COMMENT ON INDEX public.idx_user_management_user_key IS
  'At most one user_management row per auth user id or per normalized email when user_id is null';
