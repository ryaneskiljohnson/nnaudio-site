-- ============================================================================
-- Supabase Database Data Export
-- Project: cymasphere (jibirpbauzqhdiwjlrmf)
-- Export Date: 2025-01-28
-- ============================================================================
-- 
-- This file contains DATA ONLY (INSERT statements)
-- Run the schema file (cymasphere_database_export.sql) first, then this file
--
-- ============================================================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- ============================================================================
-- DATA EXPORTS
-- ============================================================================

-- Promotions
INSERT INTO public.promotions (id, created_at, updated_at, name, title, description, active, start_date, end_date, applicable_plans, discount_type, discount_value, sale_price_monthly, sale_price_annual, sale_price_lifetime, stripe_coupon_code, stripe_coupon_id, stripe_coupon_created, banner_theme, views, conversions, revenue, priority) VALUES 
('d5d641c7-4aa4-4e2e-8d73-d3c57111cfde', '2025-11-19 20:45:39.666656+00', '2025-12-10 01:58:10.915023+00', 'black_friday_2025', '🔥 Black Friday Sale', 'Lifetime access for just $99 - Save $150!', true, '2025-11-22 00:00:00+00', '2025-12-06 07:59:59+00', '{lifetime}', 'amount', 50, NULL, NULL, 99, 'BLACKFRIDAY2025', 'BLACKFRIDAY2025', false, '{"textColor": "#FFFFFF", "background": "linear-gradient(135deg, #6c63ff, #4ecdc4)", "accentColor": "#FFD700"}', 5318, 28, 2400, 100) 
ON CONFLICT (name) DO NOTHING;

-- User Management
INSERT INTO public.user_management (user_email, pro, notes) VALUES 
('lowheatbeats@gmail.com', true, 'Influencer NFR - 11/13/25'), 
('mail.sctuts@gmail.com', true, 'NFR Influencer - 11/14/25'), 
('amira.wav@gmail.com', true, 'NFR - Influencer - Dotted 11/14/25'), 
('doug.cuffman@gmail.com', true, 'Doug NFR'), 
('ryan@cymasphere.com', false, 'elite'), 
('ryaneskiljohnson@gmail.com', true, NULL), 
('garrett@cymasphere.com', true, NULL), 
('djcrave.info@gmail.com', true, 'Zack NFR'), 
('homesteaderbuilders@gmail.com', true, 'App Store Testing') 
ON CONFLICT (user_email) DO NOTHING;

-- Email Campaign Audiences
INSERT INTO public.email_campaign_audiences (id, campaign_id, audience_id, is_excluded, created_at) VALUES 
('cf19afcf-e854-4576-8f3c-9044978ef776', '501b90db-05a7-45bf-babd-1a687a8637a2', 'f9bf12b7-1803-45ee-9e3b-de33f8391d7d', false, '2025-12-02 07:34:40.161389+00'), 
('4f1b7db5-5af1-4368-ae97-350a54ae05a5', '0c1e380c-a19e-4450-9c4d-21735a23af1b', 'f9bf12b7-1803-45ee-9e3b-de33f8391d7d', false, '2025-12-02 16:29:46.62312+00'), 
('b85dc0e1-cd37-4bdc-b176-2c5b8bdcce7f', '0906ceb5-1278-4110-bee1-5429f57090aa', 'f9bf12b7-1803-45ee-9e3b-de33f8391d7d', false, '2025-12-02 17:02:11.231375+00'), 
('ca903970-9d2f-4fd3-95a7-92cf65ed515f', '6954f49b-5b9a-4307-a6bf-2164dd771ba2', 'f9bf12b7-1803-45ee-9e3b-de33f8391d7d', false, '2025-12-02 17:07:43.450573+00'), 
('8546d2d5-1f3b-4989-bd58-d2f449b0b275', 'b49f271e-10cf-494c-9da8-2818664577d1', 'f9bf12b7-1803-45ee-9e3b-de33f8391d7d', false, '2025-12-02 17:08:02.767723+00'), 
('015ba13a-538a-4469-b0a9-0c6f0d74ffc6', '44c029f4-72c7-4c74-93a1-f09d025f17dc', '713c5ad9-f284-4fe1-a32f-f172412e9171', false, '2025-12-04 16:48:22.350694+00') 
ON CONFLICT DO NOTHING;

-- Note: Large tables (profiles: 7,586 rows, email_sends: 7,424 rows, etc.) 
-- are exported separately. For complete export, use:
--   supabase db dump --data-only
--   or
--   pg_dump with --data-only flag

-- ============================================================================
-- IMPORTANT: For complete data export of ALL tables including large ones:
-- ============================================================================
-- 
-- The following tables have significant data and should be exported via
-- Supabase CLI or pg_dump for best performance:
--
-- Large tables (>1000 rows):
--   - profiles: ~7,586 rows
--   - email_sends: ~7,424 rows  
--   - email_opens: ~1,808 rows
--   - email_clicks: ~1,007 rows
--   - user_sessions: ~525 rows
--   - automation_events_default: ~186 rows
--   - ios_subscriptions: ~33 rows
--   - support_tickets: ~12 rows
--   - support_messages: ~55 rows
--   - support_attachments: ~10 rows
--
-- To export ALL data:
--   1. Use: supabase db dump -f complete_export.sql
--   2. Or: pg_dump with --data-only flag
--   3. Or: Supabase Dashboard > Database > Backups
--
-- ============================================================================

-- Re-enable foreign key checks
SET session_replication_role = 'origin';
