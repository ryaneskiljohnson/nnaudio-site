-- Manual Backfill Script to Create Subscribers for All Existing Users
-- This will fix the mismatch between users and subscribers

-- First, let's see the current state
SELECT 'BEFORE BACKFILL:' as status;
SELECT COUNT(*) as user_count FROM auth.users WHERE deleted_at IS NULL;
SELECT COUNT(*) as subscriber_count FROM subscribers;
SELECT COUNT(*) as profile_count FROM profiles;

-- Create subscribers for all users who don't have them
INSERT INTO subscribers (user_id, email, source, subscribe_date, status)
SELECT 
  u.id,
  u.email,
  'backfill' as source,
  u.created_at as subscribe_date,
  'active' as status
FROM auth.users u
LEFT JOIN subscribers s ON u.id = s.user_id
WHERE u.deleted_at IS NULL 
  AND u.email IS NOT NULL 
  AND u.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND s.user_id IS NULL
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  source = CASE WHEN subscribers.source = 'backfill' THEN 'backfill' ELSE subscribers.source END,
  updated_at = NOW();

-- Show results after backfill
SELECT 'AFTER BACKFILL:' as status;
SELECT COUNT(*) as user_count FROM auth.users WHERE deleted_at IS NULL;
SELECT COUNT(*) as subscriber_count FROM subscribers;

-- Show any users still missing subscribers
SELECT 'USERS STILL MISSING SUBSCRIBERS:' as status;
SELECT COUNT(*) as missing_count 
FROM auth.users u 
LEFT JOIN subscribers s ON u.id = s.user_id 
WHERE u.deleted_at IS NULL AND s.user_id IS NULL;

-- Show sample of created subscribers
SELECT 'SAMPLE SUBSCRIBERS:' as status;
SELECT s.id, s.email, s.source, s.status, s.subscribe_date, u.created_at as user_created_at
FROM subscribers s
JOIN auth.users u ON s.user_id = u.id
WHERE s.source = 'backfill'
LIMIT 5;

-- Update subscriber tags based on user subscription status
UPDATE subscribers 
SET tags = CASE 
  WHEN p.subscription = 'admin' THEN ARRAY['backfill', 'admin']
  WHEN p.subscription = 'monthly' THEN ARRAY['backfill', 'monthly-subscriber'] 
  WHEN p.subscription = 'annual' THEN ARRAY['backfill', 'annual-subscriber']
  WHEN p.subscription = 'lifetime' THEN ARRAY['backfill', 'lifetime-member']
  ELSE ARRAY['backfill', 'free-user']
END
FROM profiles p
WHERE subscribers.user_id = p.id;

SELECT 'BACKFILL COMPLETE!' as status; 