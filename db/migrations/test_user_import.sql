-- Test User Import Migration
-- ============================================
-- Test Customer: SERGEY PADALTSIN
-- Email: +79187536533@yandex.ru
-- Products: 7
-- ============================================

-- STEP 1: Create Auth User
-- Note: This must be done via Supabase Dashboard or Admin API
-- Cannot be done via SQL directly for security reasons
--
-- Go to: Supabase Dashboard > Authentication > Users > Add User
-- Email: +79187536533@yandex.ru
-- Password: (auto-generate or set temporary password)
-- Auto Confirm: YES
--
-- OR use this SQL if you have the proper auth admin extension:
-- This will only work if you have appropriate permissions

DO $$
DECLARE
    v_user_id uuid;
    v_email text := '+79187536533@yandex.ru';
    v_first_name text := 'SERGEY';
    v_last_name text := 'PADALTSIN';
BEGIN
    -- Check if user already exists in auth.users
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = v_email;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'User already exists with ID: %', v_user_id;
    ELSE
        RAISE NOTICE 'User does not exist. Please create via Supabase Dashboard first.';
        RAISE NOTICE 'Email: %', v_email;
        -- Exit early if user doesn't exist
        RETURN;
    END IF;
    
    -- STEP 2: Create/Update Profile
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_email,
        v_first_name,
        v_last_name,
        v_first_name || ' ' || v_last_name,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated for user: %', v_user_id;
    
    -- STEP 3: Create Product Grants
    INSERT INTO public.product_grants (user_email, product_id, granted_at, notes, created_at, updated_at)
    VALUES 
        (v_email, 'f4177a27-bfd9-4ea1-be0b-2ca02749558f'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW()),
        (v_email, '5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW()),
        (v_email, '43800acf-c5e1-4d1a-942f-bede7b3ff213'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW()),
        (v_email, '34fd6bb0-410e-4aff-a01d-8083596e7098'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW()),
        (v_email, '068f019d-177d-4203-9e4a-27b75ea2926e'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW()),
        (v_email, '9fdd6900-da3e-434d-8a5d-10cfe66dc337'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW()),
        (v_email, 'a03c75f0-d5c3-4689-9124-a787dd351fe8'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW())
    ON CONFLICT (user_email, product_id) DO NOTHING;
    
    RAISE NOTICE 'Created 7 product grants';
    
END $$;

-- STEP 4: Verification Queries
SELECT 
    u.id,
    u.email,
    u.created_at,
    p.first_name,
    p.last_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = '+79187536533@yandex.ru';

SELECT 
    pg.user_email,
    p.name as product_name,
    p.slug,
    pg.granted_at,
    pg.notes
FROM public.product_grants pg
JOIN public.products p ON p.id = pg.product_id
WHERE pg.user_email = '+79187536533@yandex.ru'
ORDER BY pg.granted_at;

-- Count check
SELECT COUNT(*) as total_grants
FROM public.product_grants
WHERE user_email = '+79187536533@yandex.ru';
