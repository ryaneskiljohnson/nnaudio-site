-- Admin notification preferences: per-admin toggles for receiving order confirmation copies.
-- Used by the admin notifications page and Stripe webhook to send admin copies of customer emails.

CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_on_paid_order boolean NOT NULL DEFAULT false,
  notify_on_free_order boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_notification_preferences_user_id_key UNIQUE (user_id)
);

COMMENT ON TABLE public.admin_notification_preferences IS 'Per-admin toggles for order confirmation email copies (paid vs free orders)';
COMMENT ON COLUMN public.admin_notification_preferences.notify_on_paid_order IS 'Send admin a copy of the customer order confirmation when order total > 0';
COMMENT ON COLUMN public.admin_notification_preferences.notify_on_free_order IS 'Send admin a copy of the customer order confirmation when order total is 0';

-- Only admins can read/upsert their own row
ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own notification preferences"
  ON public.admin_notification_preferences
  FOR SELECT
  USING (is_admin(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Admins can insert own notification preferences"
  ON public.admin_notification_preferences
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Admins can update own notification preferences"
  ON public.admin_notification_preferences
  FOR UPDATE
  USING (is_admin(auth.uid()) AND user_id = auth.uid())
  WITH CHECK (is_admin(auth.uid()) AND user_id = auth.uid());

CREATE INDEX idx_admin_notification_preferences_user_id
  ON public.admin_notification_preferences (user_id);

GRANT SELECT, INSERT, UPDATE ON public.admin_notification_preferences TO authenticated;
GRANT SELECT ON public.admin_notification_preferences TO service_role;
