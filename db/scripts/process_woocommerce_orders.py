#!/usr/bin/env python3
"""
@fileoverview Script to process WooCommerce order exports and prepare data for Supabase import
@module process_woocommerce_orders

This script reads the WooCommerce Order Items Export CSV and creates a processed CSV
with unique customers and their purchased products, ready for importing to Supabase.
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path


def parse_name(full_name):
    """
    @brief Parse a full name into first and last name components
    @param full_name Full name string from WooCommerce billing
    @returns Tuple of (first_name, last_name)
    @note Handles various name formats and edge cases
    """
    if not full_name:
        return "", ""
    
    parts = full_name.strip().split()
    if len(parts) == 0:
        return "", ""
    elif len(parts) == 1:
        return parts[0], ""
    else:
        # First part is first name, rest is last name
        return parts[0], " ".join(parts[1:])


def process_orders(input_file, output_file):
    """
    @brief Process WooCommerce orders and create customer-product mapping
    @param input_file Path to input CSV file
    @param output_file Path to output CSV file
    @returns None
    @note Filters for completed orders and aggregates products per customer
    """
    # Dictionary to store customer data: email -> {name, first_name, last_name, products_set}
    customers = defaultdict(lambda: {
        'name': '',
        'first_name': '',
        'last_name': '',
        'products': set()
    })
    
    # Track order statuses we encounter
    order_statuses = set()
    
    print(f"Reading orders from: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        row_count = 0
        for row in reader:
            row_count += 1
            
            if row_count % 10000 == 0:
                print(f"Processed {row_count} rows...")
            
            email = row['Billing Email'].strip().lower()
            order_status = row['Order Status'].strip()
            product_name = row['Product Name'].strip()
            billing_name = row['Billing Name'].strip()
            
            # Track all order statuses
            order_statuses.add(order_status)
            
            # Only include completed orders (exclude refunded, cancelled, failed, etc.)
            if order_status != 'Completed':
                continue
            
            # Skip if no email
            if not email:
                continue
            
            # Update customer info (use first occurrence for name)
            if not customers[email]['name']:
                customers[email]['name'] = billing_name
                first_name, last_name = parse_name(billing_name)
                customers[email]['first_name'] = first_name
                customers[email]['last_name'] = last_name
            
            # Add product to customer's set
            if product_name:
                customers[email]['products'].add(product_name)
    
    print(f"\nTotal rows processed: {row_count}")
    print(f"Order statuses found: {sorted(order_statuses)}")
    print(f"Unique customers with completed orders: {len(customers)}")
    
    # Write output CSV
    print(f"\nWriting processed data to: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['email', 'first_name', 'last_name', 'products', 'product_count']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for email, data in sorted(customers.items()):
            products_list = sorted(list(data['products']))
            writer.writerow({
                'email': email,
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'products': ' | '.join(products_list),
                'product_count': len(products_list)
            })
    
    print(f"✓ Successfully created {output_file}")
    print(f"  Total unique customers: {len(customers)}")
    
    # Print some statistics
    product_counts = [len(data['products']) for data in customers.values()]
    print(f"\nProduct statistics:")
    print(f"  Customers with 1 product: {sum(1 for c in product_counts if c == 1)}")
    print(f"  Customers with 2+ products: {sum(1 for c in product_counts if c >= 2)}")
    print(f"  Max products per customer: {max(product_counts) if product_counts else 0}")
    
    # Show unique products
    all_products = set()
    for data in customers.values():
        all_products.update(data['products'])
    
    print(f"\nUnique products found: {len(all_products)}")
    print("Products:")
    for product in sorted(all_products):
        print(f"  - {product}")


if __name__ == '__main__':
    # Set up file paths
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    
    input_file = exports_dir / 'Order Items Export - 2026-02-06.csv'
    output_file = exports_dir / 'customers_with_products.csv'
    
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    process_orders(input_file, output_file)
    print("\n✓ Processing complete!")
