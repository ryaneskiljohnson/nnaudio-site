#!/usr/bin/env python3
"""
@fileoverview Script to prepare final import data with mapped products
@module prepare_import_data

This script applies product mapping and bundle expansions to customer data,
preparing it for Supabase import.
"""

import csv
import json
from pathlib import Path
from collections import defaultdict


def load_product_mapping():
    """
    @brief Load final product mapping
    @returns Dictionary mapping WooCommerce names to Supabase product info
    """
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    mapping_file = exports_dir / 'product_mapping_final.csv'
    
    mapping = {}
    with open(mapping_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mapping[row['woocommerce_name']] = {
                'id': row['supabase_id'],
                'name': row['supabase_name'],
                'status': row['supabase_status']
            }
    
    return mapping


def load_bundle_expansions():
    """
    @brief Load bundle expansion rules
    @returns Dictionary mapping bundle names to list of product IDs
    """
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    bundle_file = exports_dir / 'product_mapping_bundles.json'
    
    with open(bundle_file, 'r', encoding='utf-8') as f:
        bundles = json.load(f)
    
    # Convert to lookup dictionary
    bundle_map = {}
    for bundle in bundles:
        bundle_map[bundle['woocommerce_name']] = [
            p['id'] for p in bundle['expanded_products']
        ]
    
    return bundle_map


def load_skipped_products():
    """
    @brief Load list of products to skip
    @returns Set of product names to skip
    """
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    skip_file = exports_dir / 'product_mapping_skipped.txt'
    
    skipped = set()
    with open(skip_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and line.startswith('-'):
                product = line[1:].strip()
                skipped.add(product)
    
    return skipped


def prepare_import_data():
    """
    @brief Prepare final customer and product grant data for import
    @returns None
    """
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    
    # Load mapping data
    product_mapping = load_product_mapping()
    bundle_expansions = load_bundle_expansions()
    skipped_products = load_skipped_products()
    
    print(f"Loaded {len(product_mapping)} product mappings")
    print(f"Loaded {len(bundle_expansions)} bundle expansions")
    print(f"Loaded {len(skipped_products)} products to skip")
    
    # Read customer data
    customers_file = exports_dir / 'customers_with_products.csv'
    
    # Process customers and their product grants
    customers = []
    product_grants = []
    
    stats = {
        'total_customers': 0,
        'customers_with_products': 0,
        'total_product_grants': 0,
        'products_mapped': 0,
        'products_expanded': 0,
        'products_skipped': 0,
        'products_unmapped': 0
    }
    
    unmapped_products = set()
    
    with open(customers_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            stats['total_customers'] += 1
            
            email = row['email']
            first_name = row['first_name']
            last_name = row['last_name']
            
            # Parse products
            woo_products = row['products'].split(' | ')
            
            # Map products to Supabase IDs
            supabase_product_ids = set()
            
            for woo_product in woo_products:
                # Check if bundle
                if woo_product in bundle_expansions:
                    stats['products_expanded'] += 1
                    supabase_product_ids.update(bundle_expansions[woo_product])
                    continue
                
                # Check if skipped
                if woo_product in skipped_products:
                    stats['products_skipped'] += 1
                    continue
                
                # Check if mapped
                if woo_product in product_mapping:
                    stats['products_mapped'] += 1
                    supabase_product_ids.add(product_mapping[woo_product]['id'])
                else:
                    stats['products_unmapped'] += 1
                    unmapped_products.add(woo_product)
            
            # Only add customer if they have products after mapping
            if supabase_product_ids:
                stats['customers_with_products'] += 1
                
                customers.append({
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'product_count': len(supabase_product_ids)
                })
                
                # Create product grants
                for product_id in supabase_product_ids:
                    stats['total_product_grants'] += 1
                    product_grants.append({
                        'email': email,
                        'product_id': product_id
                    })
    
    # Write customers import file
    customers_import_file = exports_dir / 'import_customers.csv'
    with open(customers_import_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['email', 'first_name', 'last_name', 'product_count']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(customers)
    
    print(f"\n✓ Customers import file: {customers_import_file}")
    print(f"  Total customers: {len(customers)}")
    
    # Write product grants import file
    grants_import_file = exports_dir / 'import_product_grants.csv'
    with open(grants_import_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['email', 'product_id']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(product_grants)
    
    print(f"✓ Product grants import file: {grants_import_file}")
    print(f"  Total product grants: {len(product_grants)}")
    
    # Write unmapped products report
    if unmapped_products:
        unmapped_file = exports_dir / 'import_unmapped_products.txt'
        with open(unmapped_file, 'w', encoding='utf-8') as f:
            f.write("# Products that could not be mapped\n")
            f.write("# These customers will not receive grants for these products\n\n")
            for product in sorted(unmapped_products):
                f.write(f"- {product}\n")
        
        print(f"⚠ Unmapped products report: {unmapped_file}")
    
    # Print statistics
    print("\n" + "="*60)
    print("Import Statistics:")
    print(f"  Total customers in WooCommerce: {stats['total_customers']}")
    print(f"  Customers with mapped products: {stats['customers_with_products']}")
    print(f"  Total product grants to create: {stats['total_product_grants']}")
    print(f"\nProduct Processing:")
    print(f"  Products mapped: {stats['products_mapped']}")
    print(f"  Products expanded (from bundles): {stats['products_expanded']}")
    print(f"  Products skipped: {stats['products_skipped']}")
    print(f"  Products unmapped: {stats['products_unmapped']}")
    
    if unmapped_products:
        print(f"\n⚠ Warning: {len(unmapped_products)} unique unmapped products")
        print("  See import_unmapped_products.txt for details")
    
    print("="*60)


if __name__ == '__main__':
    prepare_import_data()
    print("\n✓ Import data preparation complete!")
