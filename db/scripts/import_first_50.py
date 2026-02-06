#!/usr/bin/env python3
"""
@fileoverview Import first batch of 50 customers
@module import_first_50
"""

import csv
from pathlib import Path
from collections import defaultdict

script_dir = Path(__file__).parent
exports_dir = script_dir.parent / 'exports'

# Read customers
customers = []
with open(exports_dir / 'first_batch_50.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    customers = list(reader)

# Read grants (no header in file)
grants_by_email = defaultdict(list)
with open(exports_dir / 'first_batch_grants.csv', 'r', encoding='utf-8') as f:
    for line in f:
        parts = line.strip().split(',')
        if len(parts) == 2:
            email, product_id = parts
            grants_by_email[email].append(product_id)

print(f"Batch 1: {len(customers)} customers, {sum(len(g) for g in grants_by_email.values())} grants")

# Generate SQL values
values = []
for c in customers:
    email = c['email'].replace("'", "''")
    first = c['first_name'].replace("'", "''")
    last = c['last_name'].replace("'", "''")
    pids = grants_by_email.get(c['email'], [])
    if pids:
        pids_sql = "ARRAY['" + "', '".join(pids) + "']::uuid[]"
        values.append(f"('{email}', '{first}', '{last}', {pids_sql})")

sql = f"""
DO $$
DECLARE
    v_customer RECORD;
    v_user_id uuid;
    v_product_id uuid;
    v_total int := 0;
    v_success int := 0;
BEGIN
    CREATE TEMP TABLE batch_data (email text, fname text, lname text, pids uuid[]) ON COMMIT DROP;
    INSERT INTO batch_data VALUES
    {',\n    '.join(values)};
    
    SELECT COUNT(*) INTO v_total FROM batch_data;
    
    FOR v_customer IN SELECT * FROM batch_data LOOP
        BEGIN
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid,
                'authenticated', 'authenticated', v_customer.email,
                crypt('Temp' || substr(md5(random()::text), 1, 8) || '!', gen_salt('bf')),
                NOW(), '{{"provider":"email","providers":["email"]}}'::jsonb,
                ('{{"first_name":"' || v_customer.fname || '","last_name":"' || v_customer.lname || '"}}')::jsonb,
                NOW(), NOW()
            ) ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_user_id;
            
            IF v_user_id IS NULL THEN SELECT id INTO v_user_id FROM auth.users WHERE email = v_customer.email; END IF;
            
            UPDATE profiles SET first_name = v_customer.fname, last_name = v_customer.lname,
                full_name = v_customer.fname || ' ' || v_customer.lname, updated_at = NOW() WHERE id = v_user_id;
            
            FOREACH v_product_id IN ARRAY v_customer.pids LOOP
                INSERT INTO product_grants (user_email, product_id, granted_at, notes, created_at, updated_at)
                VALUES (v_customer.email, v_product_id, NOW(), 'Migrated from WooCommerce', NOW(), NOW())
                ON CONFLICT (user_email, product_id) DO NOTHING;
            END LOOP;
            
            v_success := v_success + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error: % - %', v_customer.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Done: % of % imported', v_success, v_total;
END $$;
"""

output_file = exports_dir / 'batch_1_import.sql'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"SQL written to: {output_file}")
print("Ready to execute!")
