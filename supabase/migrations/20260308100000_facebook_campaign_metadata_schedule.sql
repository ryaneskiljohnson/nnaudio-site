-- Add start_date and end_date to facebook_campaign_metadata so we can persist and load campaign schedule.
-- Values are stored as datetime-local format (YYYY-MM-DDTHH:mm) or ISO for consistency.
ALTER TABLE public.facebook_campaign_metadata
  ADD COLUMN IF NOT EXISTS start_date text,
  ADD COLUMN IF NOT EXISTS end_date text;

COMMENT ON COLUMN public.facebook_campaign_metadata.start_date IS 'Campaign start date/time (YYYY-MM-DDTHH:mm or ISO).';
COMMENT ON COLUMN public.facebook_campaign_metadata.end_date IS 'Campaign end date/time (YYYY-MM-DDTHH:mm or ISO).';
