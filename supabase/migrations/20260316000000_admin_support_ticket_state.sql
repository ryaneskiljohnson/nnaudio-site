-- Admin support ticket state: per-admin dismissal state for awaiting-response badges.
-- Used by the admin support tickets page and sidebar unread badge so each admin can
-- dismiss a customer reply until a newer reply arrives or any admin responds.

CREATE TABLE IF NOT EXISTS public.admin_support_ticket_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  dismissed_message_id uuid REFERENCES public.support_messages(id) ON DELETE SET NULL,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_support_ticket_state_admin_user_ticket_key
    UNIQUE (admin_user_id, ticket_id)
);

COMMENT ON TABLE public.admin_support_ticket_state IS
  'Per-admin dismissal state for support tickets awaiting a response.';
COMMENT ON COLUMN public.admin_support_ticket_state.admin_user_id IS
  'Admin user who dismissed the awaiting-response notification.';
COMMENT ON COLUMN public.admin_support_ticket_state.ticket_id IS
  'Support ticket whose awaiting-response state is being tracked.';
COMMENT ON COLUMN public.admin_support_ticket_state.dismissed_message_id IS
  'Latest customer message id that was dismissed by this admin.';
COMMENT ON COLUMN public.admin_support_ticket_state.dismissed_at IS
  'Timestamp when the admin dismissed the current awaiting-response indicator.';

ALTER TABLE public.admin_support_ticket_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own support ticket state"
  ON public.admin_support_ticket_state
  FOR SELECT
  USING (is_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "Admins can insert own support ticket state"
  ON public.admin_support_ticket_state
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "Admins can update own support ticket state"
  ON public.admin_support_ticket_state
  FOR UPDATE
  USING (is_admin(auth.uid()) AND admin_user_id = auth.uid())
  WITH CHECK (is_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "Admins can delete own support ticket state"
  ON public.admin_support_ticket_state
  FOR DELETE
  USING (is_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE INDEX idx_admin_support_ticket_state_admin_user_id
  ON public.admin_support_ticket_state (admin_user_id);

CREATE INDEX idx_admin_support_ticket_state_ticket_id
  ON public.admin_support_ticket_state (ticket_id);

CREATE INDEX idx_admin_support_ticket_state_dismissed_message_id
  ON public.admin_support_ticket_state (dismissed_message_id);

CREATE OR REPLACE FUNCTION update_admin_support_ticket_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at_admin_support_ticket_state
  BEFORE UPDATE ON public.admin_support_ticket_state
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_support_ticket_state_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_support_ticket_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_support_ticket_state TO service_role;
