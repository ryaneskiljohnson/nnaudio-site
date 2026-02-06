#!/usr/bin/env python3
"""
@fileoverview Automated bulk import using Supabase MCP
@module automated_bulk_import

This script imports all customers programmatically using the Supabase execute_sql tool.
"""

import csv
import json
import time
from pathlib import Path
from collections import defaultdict


PROJECT_ID = 'znecvzfogwkzinkduyuq'


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
    
    return customers, grants_by_email


def generate_batch_import_sql(customers_batch, grants_by_email):
    """
    @brief Generate SQL to import a batch of customers
    @param customers_batch List of customer dicts  
    @param grants_by_email Dict mapping email to product IDs
    @returns SQL string
    """
    # Build the SQL with all customers in batch
    customers_sql_parts = []
    
    for customer in customers_batch:
        email = customer['email'].replace("'", "''")
        first_name = customer['first_name'].replace("'", "''")
        last_name = customer['last_name'].replace("'", "''")
        product_ids = grants_by_email.get(customer['email'], [])
        
        if not product_ids:
            continue
        
        # Escape product IDs for SQL array
        product_ids_sql = "ARRAY['" + "', '".join(product_ids) + "']::uuid[]"
        
        customers_sql_parts.append(f"('{email}', '{first_name}', '{last_name}', {product_ids_sql})")
    
    if not customers_sql_parts:
        return None
    
    customers_values = ',\n        '.join(customers_sql_parts)
    
    sql = f"""
DO $$
DECLARE
    v_customer RECORD;
    v_user_id uuid;
    v_product_id uuid;
    v_customers_data TABLE(email text, first_name text, last_name text, product_ids uuid[]);
    v_total int := 0;
    v_success int := 0;
    v_errors int := 0;
BEGIN
    -- Create temp table with customer data
    CREATE TEMP TABLE temp_customers_batch (
        email text,
        first_name text,
        last_name text,
        product_ids uuid[]
    ) ON COMMIT DROP;
    
    -- Insert batch data
    INSERT INTO temp_customers_batch VALUES
        {customers_values};
    
    -- Get total count
    SELECT COUNT(*) INTO v_total FROM temp_customers_batch;
    
    -- Process each customer
    FOR v_customer IN SELECT * FROM temp_customers_batch LOOP
        BEGIN
            -- Create/get auth user
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                '00000000-0000-0000-0000-000000000000'::uuid,
                'authenticated',
                'authenticated',
                v_customer.email,
                crypt('TempPass' || substr(md5(random()::text), 1, 8) || '!', gen_salt('bf')),
                NOW(),
                '{{"provider":"email","providers":["email"]}}'::jsonb,
                ('{{"first_name":"' || v_customer.first_name || '","last_name":"' || v_customer.last_name || '"}}')::jsonb,
                NOW(),
                NOW()
            )
            ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
            RETURNING id INTO v_user_id;
            
            -- Get existing user ID if conflict
            IF v_user_id IS NULL THEN
                SELECT id INTO v_user_id FROM auth.users WHERE email = v_customer.email;
            END IF;
            
            -- Update profile
            UPDATE profiles SET
                first_name = v_customer.first_name,
                last_name = v_customer.last_name,
                full_name = v_customer.first_name || ' ' || v_customer.last_name,
                updated_at = NOW()
            WHERE id = v_user_id;
            
            -- Create product grants
            FOREACH v_product_id IN ARRAY v_customer.product_ids LOOP
                INSERT INTO product_grants (
                    user_email, product_id, granted_at, notes, created_at, updated_at
                ) VALUES (
                    v_customer.email, v_product_id, NOW(), 'Migrated from WooCommerce', NOW(), NOW()
                )
                ON CONFLICT (user_email, product_id) DO NOTHING;
            END LOOP;
            
            v_success := v_success + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'Error importing %: %', v_customer.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Batch complete: % total, % success, % errors', v_total, v_success, v_errors;
END $$;
"""
    
    return sql


def print_import_plan(customers, grants_by_email):
    """
    @brief Print the import plan
    @param customers List of customers
    @param grants_by_email Dict of grants
    @returns None
    """
    total_customers = len(customers)
    total_grants = sum(len(grants) for grants in grants_by_email.values())
    
    print("="*70)
    print("AUTOMATED BULK IMPORT")
    print("="*70)
    print()
    print(f"Total customers to import: {total_customers:,}")
    print(f"Total product grants: {total_grants:,}")
    print()
    print("This script will:")
    print("  1. Process customers in batches of 50")
    print("  2. Create auth users with confirmed emails")
    print("  3. Update/create profiles")
    print("  4. Grant products")
    print()
    print(f"Estimated batches: {(total_customers + 49) // 50}")
    print(f"Estimated time: ~{(total_customers / 50 * 2):.0f} seconds (2s per batch)")
    print()
    print("="*70)


if __name__ == '__main__':
    customers, grants_by_email = load_import_data()
    print_import_plan(customers, grants_by_email)
    
    print("\nThis script generates the SQL for bulk import.")
    print("The actual execution will be handled by calling this from another script")
    print("that uses the Supabase MCP tools.\n")
    
    # Export data for external script
    script_dir = Path(__file__).parent
    data_file = script_dir.parent / 'exports' / 'bulk_import_data.json'
    
    export_data = {
        'customers': customers,
        'grants_by_email': dict(grants_by_email),
        'total_customers': len(customers),
        'total_grants': sum(len(g) for g in grants_by_email.values())
    }
    
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"✓ Export data saved to: {data_file}")
    print("\nReady for bulk import!")
