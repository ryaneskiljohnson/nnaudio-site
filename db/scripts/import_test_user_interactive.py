#!/usr/bin/env python3
"""
@fileoverview Interactive script to import test user
@module import_test_user_interactive

This script guides through the process of importing a test user.
"""

import subprocess
import json
from pathlib import Path


# Test customer data
TEST_EMAIL = '+79187536533@yandex.ru'
TEST_FIRST_NAME = 'SERGEY'
TEST_LAST_NAME = 'PADALTSIN'
TEST_PRODUCTS = [
    ('f4177a27-bfd9-4ea1-be0b-2ca02749558f', 'MIDI Nerds'),
    ('5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5', 'Swiper MIDI'),
    ('43800acf-c5e1-4d1a-942f-bede7b3ff213', 'Rabbit Hole MIDI'),
    ('34fd6bb0-410e-4aff-a01d-8083596e7098', 'Apache MIDI'),
    ('068f019d-177d-4203-9e4a-27b75ea2926e', 'Strange Tingz'),
    ('9fdd6900-da3e-434d-8a5d-10cfe66dc337', 'Bakers Delight MIDI'),
    ('a03c75f0-d5c3-4689-9124-a787dd351fe8', 'Digital Echoes Delay'),
]

PROJECT_ID = 'znecvzfogwkzinkduyuq'


def main():
    print("="*70)
    print("TEST USER IMPORT - INTERACTIVE")
    print("="*70)
    print()
    print("Test Customer Details:")
    print(f"  Email: {TEST_EMAIL}")
    print(f"  Name: {TEST_FIRST_NAME} {TEST_LAST_NAME}")
    print(f"  Products to grant: {len(TEST_PRODUCTS)}")
    print()
    print("Products:")
    for i, (_, name) in enumerate(TEST_PRODUCTS, 1):
        print(f"  {i}. {name}")
    print()
    print("="*70)
    print()
    
    print("STEP 1: Create Auth User")
    print("-" * 70)
    print()
    print("I'll guide you through creating the auth user via Supabase Dashboard:")
    print()
    print("1. Go to: https://supabase.com/dashboard/project/" + PROJECT_ID + "/auth/users")
    print("2. Click 'Add User' button")
    print("3. Enter:")
    print(f"   - Email: {TEST_EMAIL}")
    print("   - Password: (auto-generate or set: TestUser123!)")
    print("   - Auto Confirm: YES")
    print("4. Click 'Create User'")
    print()
    
    input("Press ENTER once you've created the user in Supabase Dashboard...")
    print()
    
    print("STEP 2: Running Profile and Product Grants SQL")
    print("-" * 70)
    print()
    
    script_dir = Path(__file__).parent
    sql_file = script_dir.parent / 'migrations' / 'test_user_import.sql'
    
    print(f"SQL file location: {sql_file}")
    print()
    print("I'll now show you how to run this via Supabase SQL Editor.")
    print()
    print("Next steps will be automated via MCP...")
    print()


if __name__ == '__main__':
    main()
