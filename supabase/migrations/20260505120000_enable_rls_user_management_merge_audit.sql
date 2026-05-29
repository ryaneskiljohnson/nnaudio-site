-- @fileoverview Enables RLS on user_management_merge_audit so PostgREST anon cannot read/write it.
-- @module supabase/migrations/20260505120000_enable_rls_user_management_merge_audit
-- @note Inserts from migrations run as superuser; app/server uses service role (bypasses RLS).

ALTER TABLE public.user_management_merge_audit ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_management_merge_audit IS
  'Audit log when duplicate user_management rows were merged; admin-only via RLS; service role for jobs.';

DROP POLICY IF EXISTS "Admins can manage user_management_merge_audit"
  ON public.user_management_merge_audit;

CREATE POLICY "Admins can manage user_management_merge_audit"
  ON public.user_management_merge_audit
  FOR ALL
  USING (public.is_admin(auth.uid()));
