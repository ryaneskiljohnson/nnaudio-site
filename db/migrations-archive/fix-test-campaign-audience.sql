-- Fix Test Campaign by adding ryan@cymasphere.com to its target audience
-- The Test Campaign is targeting audience ID: f9bf12b7-1803-45ee-9e3b-de33f8391d7d

-- First, ensure ryan@cymasphere.com exists as a subscriber
INSERT INTO subscribers (email, status, source, created_at)
VALUES ('ryan@cymasphere.com', 'active', 'admin_setup', NOW())
ON CONFLICT (email) DO UPDATE SET
  status = 'active',
  updated_at = NOW();

-- Add ryan@cymasphere.com to the target audience
INSERT INTO email_audience_subscribers (audience_id, subscriber_id, created_at)
SELECT 
  'f9bf12b7-1803-45ee-9e3b-de33f8391d7d'::uuid,
  s.id,
  NOW()
FROM subscribers s
WHERE s.email = 'ryan@cymasphere.com'
ON CONFLICT (audience_id, subscriber_id) DO NOTHING;

-- Check what we've done
SELECT 
  ea.name as audience_name,
  ea.description,
  ea.subscriber_count,
  s.email as subscriber_email,
  s.status as subscriber_status
FROM email_audiences ea
LEFT JOIN email_audience_subscribers eas ON ea.id = eas.audience_id
LEFT JOIN subscribers s ON eas.subscriber_id = s.id
WHERE ea.id = 'f9bf12b7-1803-45ee-9e3b-de33f8391d7d'::uuid; 