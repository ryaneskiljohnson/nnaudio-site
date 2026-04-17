-- @fileoverview Refactors user_management from email PK to surrogate id + user_id FK.
-- @module supabase/migrations/20260416101000_user_management_add_user_id
-- @note Apply with your normal workflow (do not db reset).

ALTER TABLE public.user_management
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.user_management um
  SET user_id = u.id
  FROM auth.users u
  WHERE um.user_id IS NULL
    AND lower(u.email) = lower(um.user_email);

-- Remove duplicate rows that differ only by email casing before unique index on lower(email)
DELETE FROM public.user_management um
WHERE um.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY lower(user_email)
        ORDER BY id
      ) AS rn
    FROM public.user_management
    WHERE user_email IS NOT NULL
  ) t
  WHERE rn > 1
);

ALTER TABLE public.user_management
  DROP CONSTRAINT IF EXISTS user_management_pkey;

ALTER TABLE public.user_management
  ADD CONSTRAINT user_management_pkey PRIMARY KEY (id);

ALTER TABLE public.user_management
  ALTER COLUMN user_email DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_management_user_id
  ON public.user_management(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_management_user_email_ci
  ON public.user_management(lower(user_email))
  WHERE user_email IS NOT NULL;

ALTER TABLE public.user_management
  DROP CONSTRAINT IF EXISTS user_management_user_id_or_email_chk;

ALTER TABLE public.user_management
  ADD CONSTRAINT user_management_user_id_or_email_chk
  CHECK (user_id IS NOT NULL OR user_email IS NOT NULL);

COMMENT ON COLUMN public.user_management.id IS 'Surrogate primary key';
COMMENT ON COLUMN public.user_management.user_id IS 'Supabase auth user id when the account exists; canonical link when set';
