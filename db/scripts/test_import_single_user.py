#!/usr/bin/env python3
"""
@fileoverview Script to test import a single user and their product grants
@module test_import_single_user

This script imports one test user to verify the import process before doing bulk import.
"""

import sys
import subprocess
import json
from pathlib import Path


# Test customer data
TEST_CUSTOMER = {
    'email': '+79187536533@yandex.ru',
    'first_name': 'SERGEY',
    'last_name': 'PADALTSIN',
    'product_ids': [
        'f4177a27-bfd9-4ea1-be0b-2ca02749558f',  # MIDI Nerds
        '5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5',  # Swiper MIDI
        '43800acf-c5e1-4d1a-942f-bede7b3ff213',  # Rabbit Hole MIDI
        '34fd6bb0-410e-4aff-a01d-8083596e7098',  # Apache MIDI
        '068f019d-177d-4203-9e4a-27b75ea2926e',  # Strange Tingz
        '9fdd6900-da3e-434d-8a5d-10cfe66dc337',  # Bakers Delight MIDI
        'a03c75f0-d5c3-4689-9124-a787dd351fe8',  # Digital Echoes Delay
    ]
}

PROJECT_ID = 'znecvzfogwkzinkduyuq'


def run_sql(query):
    """
    @brief Execute SQL query via Supabase CLI
    @param query SQL query to execute
    @returns Query result
    """
    # Use the MCP tool via Python for now - we'll create the actual implementation
    print(f"SQL Query: {query[:100]}...")
    return None


def create_test_user():
    """
    @brief Create test user with auth and profile
    @returns User ID if successful, None otherwise
    """
    email = TEST_CUSTOMER['email']
    first_name = TEST_CUSTOMER['first_name']
    last_name = TEST_CUSTOMER['last_name']
    
    print("="*70)
    print("TEST USER IMPORT")
    print("="*70)
    print(f"\nTest Customer:")
    print(f"  Email: {email}")
    print(f"  Name: {first_name} {last_name}")
    print(f"  Products: {len(TEST_CUSTOMER['product_ids'])}")
    print()
    
    # Step 1: Create auth user
    print("Step 1: Creating Supabase Auth user...")
    print(f"  Email: {email}")
    print(f"  Password: Will be auto-generated (user can reset)")
    print()
    
    # NOTE: We need to use Supabase Admin API to create user
    # For now, we'll create SQL that the user can run manually or we can use MCP
    
    auth_sql = f"""
-- Step 1: Create auth user (requires admin API or manual creation)
-- Email: {email}
-- This will need to be done via Supabase Dashboard or Admin API
-- The user ID will be auto-generated
"""
    
    print(auth_sql)
    print("⚠️  Note: Auth user creation requires Supabase Admin API")
    print("   We'll create the SQL for profile and grants that can be run once user is created")
    print()
    
    # For testing, let's create a SQL script that assumes the user exists
    print("Step 2: Creating SQL for profile and product grants...")
    
    profile_sql = f"""
-- Step 2: Create profile
-- First, get the user_id from auth.users
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get user ID from auth.users (assuming user exists)
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = '{email}';
    
    -- If user doesn't exist, you need to create them via Supabase Admin API first
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users. Please create auth user first.';
    END IF;
    
    -- Insert profile
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
        '{email}',
        '{first_name}',
        '{last_name}',
        '{first_name} {last_name}',
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
END $$;
"""
    
    grants_sql = f"""
-- Step 3: Create product grants
DO $$
DECLARE
    v_user_id uuid;
    v_product_id uuid;
    v_product_ids uuid[] := ARRAY[
        '{TEST_CUSTOMER['product_ids'][0]}'::uuid,
        '{TEST_CUSTOMER['product_ids'][1]}'::uuid,
        '{TEST_CUSTOMER['product_ids'][2]}'::uuid,
        '{TEST_CUSTOMER['product_ids'][3]}'::uuid,
        '{TEST_CUSTOMER['product_ids'][4]}'::uuid,
        '{TEST_CUSTOMER['product_ids'][5]}'::uuid,
        '{TEST_CUSTOMER['product_ids'][6]}'::uuid
    ];
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = '{email}';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Insert product grants
    FOREACH v_product_id IN ARRAY v_product_ids
    LOOP
        INSERT INTO public.product_grants (
            user_email,
            product_id,
            granted_at,
            notes,
            created_at,
            updated_at
        ) VALUES (
            '{email}',
            v_product_id,
            NOW(),
            'Migrated from WooCommerce',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_email, product_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created % product grants', array_length(v_product_ids, 1);
END $$;
"""
    
    # Write SQL file
    script_dir = Path(__file__).parent
    sql_file = script_dir.parent / 'exports' / 'test_user_import.sql'
    
    full_sql = f"""-- Test User Import SQL
-- Email: {email}
-- Name: {first_name} {last_name}
-- Products: {len(TEST_CUSTOMER['product_ids'])}
--
-- INSTRUCTIONS:
-- 1. First create the auth user via Supabase Dashboard or Admin API
-- 2. Then run this SQL script in Supabase SQL Editor
--

{profile_sql}

{grants_sql}

-- Verification queries
SELECT 
    u.id,
    u.email,
    p.first_name,
    p.last_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = '{email}';

SELECT 
    pg.user_email,
    p.name as product_name,
    pg.granted_at
FROM public.product_grants pg
JOIN public.products p ON p.id = pg.product_id
WHERE pg.user_email = '{email}'
ORDER BY pg.granted_at;
"""
    
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(full_sql)
    
    print(f"✓ SQL script created: {sql_file}")
    print()
    print("="*70)
    print("NEXT STEPS")
    print("="*70)
    print()
    print("Since we need to use the Supabase Management API to create auth users,")
    print("I'll use the Supabase MCP tool to create this test user directly.")
    print()
    
    return sql_file


def get_product_names():
    """
    @brief Get product names for the test customer's products
    @returns Dict of product_id -> name
    """
    product_names = {
        'f4177a27-bfd9-4ea1-be0b-2ca02749558f': 'MIDI Nerds',
        '5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5': 'Swiper MIDI',
        '43800acf-c5e1-4d1a-942f-bede7b3ff213': 'Rabbit Hole MIDI',
        '34fd6bb0-410e-4aff-a01d-8083596e7098': 'Apache MIDI',
        '068f019d-177d-4203-9e4a-27b75ea2926e': 'Strange Tingz',
        '9fdd6900-da3e-434d-8a5d-10cfe66dc337': 'Bakers Delight MIDI',
        'a03c75f0-d5c3-4689-9124-a787dd351fe8': 'Digital Echoes Delay',
    }
    return product_names


if __name__ == '__main__':
    sql_file = create_test_user()
    
    product_names = get_product_names()
    
    print("\nTest User Products:")
    for i, product_id in enumerate(TEST_CUSTOMER['product_ids'], 1):
        print(f"  {i}. {product_names[product_id]}")
    
    print("\n" + "="*70)
    print()
    print("I'll now use the Supabase MCP tool to create this user directly.")
    print("This will test the complete import process.")
