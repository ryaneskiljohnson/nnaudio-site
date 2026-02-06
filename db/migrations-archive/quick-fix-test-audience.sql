-- Quick fix: Add ryan@cymasphere.com to Test Audience for immediate testing

-- First ensure the subscriber exists
INSERT INTO subscribers (id, email, status, source, created_at)
VALUES (gen_random_uuid(), 'ryan@cymasphere.com', 'active', 'test_setup', NOW())
ON CONFLICT (email) DO UPDATE SET status = 'active';

-- Add to Test Audience (ID from migration: a1b5e282-df51-4670-a8a8-4bc9e8b0e081)
INSERT INTO email_audience_subscribers (audience_id, subscriber_id)
SELECT 
  'a1b5e282-df51-4670-a8a8-4bc9e8b0e081'::uuid,
  s.id
FROM subscribers s
WHERE s.email = 'ryan@cymasphere.com'
ON CONFLICT (audience_id, subscriber_id) DO NOTHING;

-- Verify it worked
SELECT 'Test setup complete!' as status, s.email 
FROM email_audience_subscribers eas
JOIN subscribers s ON s.id = eas.subscriber_id
WHERE eas.audience_id = 'a1b5e282-df51-4670-a8a8-4bc9e8b0e081'; 