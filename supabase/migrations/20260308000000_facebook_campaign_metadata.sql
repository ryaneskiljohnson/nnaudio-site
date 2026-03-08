-- Store description and platforms for Facebook ad campaigns (Meta API does not provide these).
-- campaign_id is the Meta campaign id (e.g. "123456789").
CREATE TABLE IF NOT EXISTS public.facebook_campaign_metadata (
  campaign_id text PRIMARY KEY,
  description text,
  platforms jsonb DEFAULT '{"facebook": true, "instagram": true}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.facebook_campaign_metadata IS 'App-only metadata for Facebook ad campaigns (description, platforms). Meta API does not store these.';

ALTER TABLE public.facebook_campaign_metadata ENABLE ROW LEVEL SECURITY;

-- Admins can manage (same pattern as other admin tables)
CREATE POLICY "Admins can manage facebook_campaign_metadata"
  ON public.facebook_campaign_metadata
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_facebook_campaign_metadata_campaign_id ON public.facebook_campaign_metadata(campaign_id);
