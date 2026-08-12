-- Anonymous live-visitor presence for the admin "on site now" count.
-- Rows are upserted by /api/presence (service role) and counted when last_seen
-- is within the active window. No PII is stored.

CREATE TABLE IF NOT EXISTS public.site_presence (
  visitor_id uuid PRIMARY KEY,
  path text NOT NULL DEFAULT '/',
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_presence IS
  'Ephemeral anonymous visitors currently on the site. last_seen is heartbeat; stale rows are deleted.';
COMMENT ON COLUMN public.site_presence.visitor_id IS
  'Browser-local UUID (localStorage). One row per browser, not per tab.';
COMMENT ON COLUMN public.site_presence.path IS
  'Most recent pathname, query string stripped.';

CREATE INDEX IF NOT EXISTS idx_site_presence_last_seen
  ON public.site_presence (last_seen DESC);

ALTER TABLE public.site_presence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.site_presence FROM anon, authenticated;
GRANT ALL ON public.site_presence TO service_role;
