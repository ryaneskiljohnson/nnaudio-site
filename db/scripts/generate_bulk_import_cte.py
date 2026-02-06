#!/usr/bin/env python3
"""
@fileoverview Generate CTE-based bulk import SQL
@module generate_bulk_import_cte
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

# Read grants
grants_by_email = defaultdict(list)
with open(exports_dir / 'first_batch_grants.csv', 'r', encoding='utf-8') as f:
    for line in f:
        parts = line.strip().split(',')
        if len(parts) == 2:
            email, product_id = parts
            grants_by_email[email].append(product_id)

print(f"Generating CTE-based import for {len(customers)} customers...")

# Generate user insert values
user_values = []
for c in customers:
    email = c['email'].replace("'", "''")
    first = c['first_name'].replace("'", "''")
    last = c['last_name'].replace("'", "''")
    json_meta = '{"provider":"email","providers":["email"]}'
    json_user = f'{{"first_name":"{first}","last_name":"{last}"}}'
    user_values.append(
        f"(gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', "
        f"'{email}', crypt('Temp' || substr(md5(random()::text), 1, 8) || '!', gen_salt('bf')), "
        f"NOW(), '{json_meta}'::jsonb, '{json_user}'::jsonb, NOW(), NOW())"
    )

# Generate grant values
grant_values = []
for c in customers:
    email = c['email'].replace("'", "''")
    for pid in grants_by_email.get(c['email'], []):
        grant_values.append(f"('{email}', '{pid}'::uuid, NOW(), 'Migrated from WooCommerce', NOW(), NOW())")

sql = f"""
-- Bulk import using CTEs (much faster, no loops)
WITH new_users AS (
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES
    {',\n    '.join(user_values)}
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id, email, raw_user_meta_data
),
updated_profiles AS (
    UPDATE profiles p SET
        first_name = (u.raw_user_meta_data->>'first_name'),
        last_name = (u.raw_user_meta_data->>'last_name'),
        full_name = (u.raw_user_meta_data->>'first_name') || ' ' || (u.raw_user_meta_data->>'last_name'),
        updated_at = NOW()
    FROM new_users u
    WHERE p.id = u.id
    RETURNING p.id
),
new_grants AS (
    INSERT INTO product_grants (user_email, product_id, granted_at, notes, created_at, updated_at)
    VALUES
    {',\n    '.join(grant_values)}
    ON CONFLICT (user_email, product_id) DO NOTHING
    RETURNING user_email
)
SELECT
    (SELECT COUNT(*) FROM new_users) as users_processed,
    (SELECT COUNT(*) FROM updated_profiles) as profiles_updated,
    (SELECT COUNT(*) FROM new_grants) as grants_created;
"""

output_file = exports_dir / 'batch_1_import_cte.sql'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"✓ SQL written to: {output_file}")
print("This will import all 50 users in a single transaction!")
