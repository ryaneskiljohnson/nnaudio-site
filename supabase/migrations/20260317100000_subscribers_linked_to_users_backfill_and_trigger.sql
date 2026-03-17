-- Subscribers linked to users: backfill + trigger fix
--
-- Why you might have zero subscribers:
-- 1. Backfill ran when auth.users was empty.
-- 2. Trigger create_subscriber_for_new_user() may run without SECURITY DEFINER,
--    so RLS blocks the insert when new users sign up.
-- 3. Register API inserts as anon; no policy allows INSERT for new user's own row.
--
-- This migration:
-- - Backfills subscribers for all auth.users that don't have one (idempotent).
-- - Recreates the trigger function with SECURITY DEFINER so new signups get a subscriber.
-- - Adds RLS policy so a user can insert their own subscriber row (for register route).

-- 1) Backfill: create subscriber for every auth user that doesn't have one
--    (Disable automation_signup_trigger during backfill so it doesn't hit automation_events.)
DROP TRIGGER IF EXISTS automation_signup_trigger ON public.subscribers;

INSERT INTO public.subscribers (user_id, email, source, subscribe_date, status, metadata)
SELECT
  u.id,
  u.email,
  'backfill'::varchar(100),
  u.created_at,
  'active'::subscriber_status,
  COALESCE(
    (SELECT jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name,
      'subscription', p.subscription,
      'auth_created_at', u.created_at
    )
    FROM public.profiles p WHERE p.id = u.id),
    '{}'::jsonb
  )
FROM auth.users u
LEFT JOIN public.subscribers s ON s.user_id = u.id
WHERE u.deleted_at IS NULL
  AND u.email IS NOT NULL
  AND u.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND s.id IS NULL
ON CONFLICT (email) DO UPDATE SET
  user_id = COALESCE(subscribers.user_id, EXCLUDED.user_id),
  source = COALESCE(subscribers.source, EXCLUDED.source),
  metadata = subscribers.metadata || EXCLUDED.metadata,
  updated_at = NOW();

-- (Leave automation_signup_trigger dropped so subscriber inserts don't fail if automation_events is missing.)

-- 2) Trigger function with SECURITY DEFINER so it can insert despite RLS
CREATE OR REPLACE FUNCTION public.create_subscriber_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    INSERT INTO public.subscribers (user_id, email, source, subscribe_date, status)
    VALUES (NEW.id, NEW.email, 'signup', COALESCE(NEW.created_at, NOW()), 'active')
    ON CONFLICT (email) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS create_subscriber_on_user_creation ON auth.users;
CREATE TRIGGER create_subscriber_on_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_subscriber_for_new_user();

-- 3) Allow users to insert their own subscriber row (for register route after signUp)
DROP POLICY IF EXISTS "Users can insert own subscriber" ON public.subscribers;
CREATE POLICY "Users can insert own subscriber" ON public.subscribers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
