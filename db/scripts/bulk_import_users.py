#!/usr/bin/env python3
"""
@fileoverview Bulk import users and product grants from WooCommerce
@module bulk_import_users

This script imports all customers and their product grants in batches.
"""

import csv
import time
from pathlib import Path
from collections import defaultdict


def load_import_data():
    """
    @brief Load customer and product grant data
    @returns Tuple of (customers list, grants dict)
    """
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    
    customers_file = exports_dir / 'import_customers_high_quality.csv'
    grants_file = exports_dir / 'import_product_grants.csv'
    
    # Load customers
    customers = []
    with open(customers_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        customers = list(reader)
    
    # Load grants grouped by email
    grants_by_email = defaultdict(list)
    with open(grants_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = row['email']
            # Only include grants for high-quality customers
            customer_emails = {c['email'] for c in customers}
            if email in customer_emails:
                grants_by_email[email].append(row['product_id'])
    
    print(f"Loaded {len(customers)} customers")
    print(f"Loaded grants for {len(grants_by_email)} customers")
    
    return customers, grants_by_email


def generate_batch_sql(customers_batch, grants_by_email, batch_num):
    """
    @brief Generate SQL for a batch of customers
    @param customers_batch List of customer dicts
    @param grants_by_email Dict mapping email to product IDs
    @param batch_num Batch number for tracking
    @returns SQL string
    """
    sql = f"""-- Batch {batch_num}: Importing {len(customers_batch)} customers
-- ============================================

DO $$
DECLARE
    v_user_id uuid;
    v_email text;
    v_first_name text;
    v_last_name text;
    v_product_ids uuid[];
    v_product_id uuid;
    v_success_count int := 0;
    v_error_count int := 0;
BEGIN
"""
    
    for customer in customers_batch:
        email = customer['email']
        first_name = customer['first_name'].replace("'", "''")  # Escape single quotes
        last_name = customer['last_name'].replace("'", "''")
        product_ids = grants_by_email.get(email, [])
        
        if not product_ids:
            continue
        
        product_ids_str = "', '".join(product_ids)
        
        sql += f"""
    -- Customer: {email}
    BEGIN
        v_email := '{email}';
        v_first_name := '{first_name}';
        v_last_name := '{last_name}';
        v_product_ids := ARRAY['{product_ids_str}']::uuid[];
        
        -- Create auth user
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            v_email,
            crypt('TempPass' || substr(md5(random()::text), 1, 8) || '!', gen_salt('bf')),
            NOW(),
            '{{"provider":"email","providers":["email"]}}'::jsonb,
            ('{{"first_name":"' || v_first_name || '","last_name":"' || v_last_name || '"}}')::jsonb,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            updated_at = NOW()
        RETURNING id INTO v_user_id;
        
        -- Get user ID if already exists
        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
        END IF;
        
        -- Update profile (likely exists from trigger, but update name)
        UPDATE profiles SET
            first_name = v_first_name,
            last_name = v_last_name,
            full_name = v_first_name || ' ' || v_last_name,
            updated_at = NOW()
        WHERE id = v_user_id;
        
        -- Create product grants
        FOREACH v_product_id IN ARRAY v_product_ids
        LOOP
            INSERT INTO product_grants (
                user_email, product_id, granted_at, notes, created_at, updated_at
            ) VALUES (
                v_email, v_product_id, NOW(), 'Migrated from WooCommerce', NOW(), NOW()
            )
            ON CONFLICT (user_email, product_id) DO NOTHING;
        END LOOP;
        
        v_success_count := v_success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE WARNING 'Error importing %: %', v_email, SQLERRM;
    END;
"""
    
    sql += f"""
    RAISE NOTICE 'Batch {batch_num} complete: % successful, % errors', v_success_count, v_error_count;
END $$;

-- Batch {batch_num} verification
SELECT 
    'Batch {batch_num}' as batch,
    COUNT(DISTINCT u.email) as users_in_batch,
    COUNT(pg.id) as grants_in_batch
FROM auth.users u
LEFT JOIN product_grants pg ON pg.user_email = u.email
WHERE u.created_at >= NOW() - INTERVAL '5 minutes';
"""
    
    return sql


def create_batch_files(batch_size=100):
    """
    @brief Create batch SQL files for import
    @param batch_size Number of customers per batch
    @returns None
    """
    customers, grants_by_email = load_import_data()
    
    script_dir = Path(__file__).parent
    migrations_dir = script_dir.parent / 'migrations'
    batch_dir = migrations_dir / 'bulk_import_batches'
    batch_dir.mkdir(exist_ok=True)
    
    total_batches = (len(customers) + batch_size - 1) // batch_size
    
    print(f"\nCreating {total_batches} batch files ({batch_size} customers per batch)...")
    
    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(customers))
        batch = customers[start_idx:end_idx]
        
        sql = generate_batch_sql(batch, grants_by_email, batch_num + 1)
        
        batch_file = batch_dir / f'batch_{batch_num + 1:04d}.sql'
        with open(batch_file, 'w', encoding='utf-8') as f:
            f.write(sql)
        
        if (batch_num + 1) % 10 == 0:
            print(f"  Created batch {batch_num + 1}/{total_batches}...")
    
    print(f"\n✓ Created {total_batches} batch files in {batch_dir}")
    
    # Create master execution script
    master_script = migrations_dir / 'run_bulk_import.sql'
    with open(master_script, 'w', encoding='utf-8') as f:
        f.write(f"""-- Master Bulk Import Script
-- ============================================
-- Total customers: {len(customers)}
-- Total batches: {total_batches}
-- Batch size: {batch_size}
-- ============================================
--
-- This file lists all batch files to run.
-- Run each batch file sequentially via Supabase SQL Editor
-- or use a script to execute them programmatically.
--
-- Batch files location: {batch_dir}
--
""")
        for batch_num in range(1, total_batches + 1):
            f.write(f"-- \\i {batch_dir}/batch_{batch_num:04d}.sql\n")
    
    print(f"✓ Created master script: {master_script}")
    
    return batch_dir, total_batches


if __name__ == '__main__':
    print("="*70)
    print("BULK USER IMPORT - BATCH GENERATOR")
    print("="*70)
    print()
    
    batch_dir, total_batches = create_batch_files(batch_size=100)
    
    print()
    print("="*70)
    print("NEXT STEPS")
    print("="*70)
    print()
    print(f"1. {total_batches} SQL batch files have been created")
    print(f"2. Location: {batch_dir}")
    print()
    print("To import programmatically, I'll now create a Python script")
    print("that uses the Supabase MCP to execute each batch...")
