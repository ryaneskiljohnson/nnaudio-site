-- Add ryan@cymasphere.com to subscribers table and Test Audience for safe testing

-- First, ensure ryan@cymasphere.com exists as a subscriber
INSERT INTO subscribers (email, first_name, last_name, status, email_opt_in, subscription, created_at)
VALUES ('ryan@cymasphere.com', 'Ryan', 'Test', 'active', true, 'none', NOW())
ON CONFLICT (email) DO UPDATE SET
  status = 'active',
  email_opt_in = true,
  updated_at = NOW();

-- Get the Test Audience ID (from migration 20241221000015_create_new_test_audiences.sql)
-- The Test Audience ID is: a1b5e282-df51-4670-a8a8-4bc9e8b0e081

-- Add ryan@cymasphere.com to the Test Audience via junction table
INSERT INTO email_audience_subscribers (audience_id, subscriber_id)
SELECT 
  'a1b5e282-df51-4670-a8a8-4bc9e8b0e081'::uuid,
  s.id
FROM subscribers s
WHERE s.email = 'ryan@cymasphere.com'
ON CONFLICT (audience_id, subscriber_id) DO NOTHING;

-- Verify the setup
SELECT 
  a.name as audience_name,
  s.email,
  s.first_name,
  s.last_name,
  s.status,
  s.email_opt_in
FROM email_audiences a
JOIN email_audience_subscribers eas ON a.id = eas.audience_id
JOIN subscribers s ON s.id = eas.subscriber_id
WHERE a.id = 'a1b5e282-df51-4670-a8a8-4bc9e8b0e081'
  AND s.email = 'ryan@cymasphere.com';

-- Show Test Audience details
SELECT 
  name,
  description,
  filters,
  subscriber_count
FROM email_audiences 
WHERE id = 'a1b5e282-df51-4670-a8a8-4bc9e8b0e081'; 