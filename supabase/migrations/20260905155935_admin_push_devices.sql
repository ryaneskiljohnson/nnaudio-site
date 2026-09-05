-- APNs device tokens for the NNAudio admin iOS wrapper.
-- Only the service role reads/writes this table (register API + sender).

CREATE TABLE IF NOT EXISTS public.admin_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token text NOT NULL,
  sandbox boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_push_devices_device_token_key UNIQUE (device_token)
);

COMMENT ON TABLE public.admin_push_devices IS 'APNs device tokens for the NNAudio admin iOS wrapper';
COMMENT ON COLUMN public.admin_push_devices.device_token IS 'Hex APNs device token';
COMMENT ON COLUMN public.admin_push_devices.sandbox IS 'True when the token was issued by the APNs sandbox (Xcode Debug)';

ALTER TABLE public.admin_push_devices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_push_devices FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_push_devices TO service_role;

CREATE INDEX IF NOT EXISTS idx_admin_push_devices_sandbox
  ON public.admin_push_devices (sandbox);
