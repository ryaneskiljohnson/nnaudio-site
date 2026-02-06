#!/usr/bin/env python3
"""
@fileoverview Script to validate and filter customer emails
@module validate_emails

This script analyzes email quality and filters out obvious fake/test emails.
"""

import csv
import re
from pathlib import Path
from collections import defaultdict


# Common disposable email domains
DISPOSABLE_DOMAINS = {
    'mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com',
    'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
    'yopmail.com', 'trashmail.com', 'sharklasers.com', 'guerrillamail.info',
    'grr.la', 'guerrillamail.biz', 'guerrillamail.de', 'spam4.me',
    'temp.email', 'tempmail.net', 'dispostable.com', 'mailnesia.com',
    'emailondeck.com', 'mytemp.email', 'mohmal.com', 'mailcatch.com'
}

# Common test patterns
TEST_PATTERNS = [
    r'^test[0-9]*@',
    r'^fake',
    r'^dummy',
    r'^noemail',
    r'^no-reply',
    r'^admin@test',
    r'@example\.com$',
    r'@test\.com$',
    r'@localhost',
    r'^asdf',
    r'^qwerty',
    r'^xxx',
    r'^000',
]


def is_disposable_email(email):
    """
    @brief Check if email uses a disposable domain
    @param email Email address to check
    @returns True if disposable, False otherwise
    """
    try:
        domain = email.split('@')[1].lower()
        return domain in DISPOSABLE_DOMAINS
    except:
        return False


def matches_test_pattern(email):
    """
    @brief Check if email matches common test patterns
    @param email Email address to check
    @returns True if matches test pattern, False otherwise
    """
    email_lower = email.lower()
    for pattern in TEST_PATTERNS:
        if re.search(pattern, email_lower):
            return True
    return False


def has_suspicious_patterns(email):
    """
    @brief Check for suspicious patterns in email
    @param email Email address to check
    @returns Tuple of (is_suspicious, reason)
    """
    email_lower = email.lower()
    local_part = email_lower.split('@')[0] if '@' in email_lower else email_lower
    
    # Check for multiple consecutive special chars
    if re.search(r'[._-]{3,}', local_part):
        return True, 'multiple_special_chars'
    
    # Check for all numbers
    if re.match(r'^[0-9]+$', local_part):
        return True, 'all_numbers'
    
    # Check for keyboard mashing patterns
    if re.search(r'(qwerty|asdf|zxcv|12345|abcde)', local_part):
        return True, 'keyboard_mashing'
    
    # Check for repeated characters
    if re.search(r'(.)\1{5,}', local_part):
        return True, 'repeated_chars'
    
    # Check for very short local part (less than 3 chars)
    if len(local_part) < 3:
        return True, 'too_short'
    
    return False, None


def validate_email_syntax(email):
    """
    @brief Basic email syntax validation
    @param email Email address to validate
    @returns True if valid syntax, False otherwise
    """
    # Basic regex for email validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def analyze_emails():
    """
    @brief Analyze email quality in customer data
    @returns None
    """
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    
    customers_file = exports_dir / 'import_customers.csv'
    
    customers = []
    
    # Categories
    valid_emails = []
    invalid_syntax = []
    disposable = []
    test_patterns = []
    suspicious = []
    low_engagement = []
    
    print("Analyzing email quality...\n")
    
    with open(customers_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            email = row['email']
            product_count = int(row['product_count'])
            
            customer = {
                'email': email,
                'first_name': row['first_name'],
                'last_name': row['last_name'],
                'product_count': product_count
            }
            
            customers.append(customer)
            
            # Check syntax
            if not validate_email_syntax(email):
                invalid_syntax.append(customer)
                continue
            
            # Check disposable
            if is_disposable_email(email):
                disposable.append(customer)
                continue
            
            # Check test patterns
            if matches_test_pattern(email):
                test_patterns.append(customer)
                continue
            
            # Check suspicious patterns
            is_susp, reason = has_suspicious_patterns(email)
            if is_susp:
                suspicious.append({**customer, 'reason': reason})
                continue
            
            # Check engagement (single product might be test/promotion)
            if product_count == 1:
                low_engagement.append(customer)
            
            # Passed all checks
            valid_emails.append(customer)
    
    total = len(customers)
    
    print("="*70)
    print(f"EMAIL VALIDATION REPORT")
    print("="*70)
    print(f"\nTotal customers: {total:,}")
    print(f"\nIssues found:")
    print(f"  Invalid syntax:        {len(invalid_syntax):,} ({len(invalid_syntax)/total*100:.1f}%)")
    print(f"  Disposable emails:     {len(disposable):,} ({len(disposable)/total*100:.1f}%)")
    print(f"  Test patterns:         {len(test_patterns):,} ({len(test_patterns)/total*100:.1f}%)")
    print(f"  Suspicious patterns:   {len(suspicious):,} ({len(suspicious)/total*100:.1f}%)")
    
    print(f"\nEngagement:")
    print(f"  Single product only:   {len(low_engagement):,} ({len(low_engagement)/total*100:.1f}%)")
    print(f"  Multiple products:     {total - len(low_engagement):,} ({(total - len(low_engagement))/total*100:.1f}%)")
    
    high_quality = len([c for c in customers if c not in invalid_syntax + disposable + test_patterns + suspicious])
    print(f"\nHigh-quality emails:   {high_quality:,} ({high_quality/total*100:.1f}%)")
    
    # Write filtered outputs
    print("\n" + "="*70)
    print("CREATING FILTERED FILES")
    print("="*70)
    
    # 1. High quality emails only (no issues detected)
    high_quality_file = exports_dir / 'import_customers_high_quality.csv'
    high_quality_customers = [c for c in customers if c not in invalid_syntax + disposable + test_patterns + suspicious]
    
    with open(high_quality_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['email', 'first_name', 'last_name', 'product_count']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(high_quality_customers)
    
    print(f"\n✓ High-quality emails: {high_quality_file}")
    print(f"  Count: {len(high_quality_customers):,}")
    
    # 2. Medium quality (includes single-product customers)
    medium_quality_file = exports_dir / 'import_customers_medium_quality.csv'
    medium_quality_customers = [c for c in high_quality_customers if c['product_count'] >= 2]
    
    with open(medium_quality_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['email', 'first_name', 'last_name', 'product_count']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(medium_quality_customers)
    
    print(f"✓ Medium-quality (2+ products): {medium_quality_file}")
    print(f"  Count: {len(medium_quality_customers):,}")
    
    # 3. Issues report
    issues_file = exports_dir / 'email_validation_issues.csv'
    all_issues = []
    
    for customer in invalid_syntax:
        all_issues.append({**customer, 'issue': 'invalid_syntax'})
    for customer in disposable:
        all_issues.append({**customer, 'issue': 'disposable_domain'})
    for customer in test_patterns:
        all_issues.append({**customer, 'issue': 'test_pattern'})
    for customer in suspicious:
        all_issues.append({
            'email': customer['email'],
            'first_name': customer['first_name'],
            'last_name': customer['last_name'],
            'product_count': customer['product_count'],
            'issue': f"suspicious_{customer['reason']}"
        })
    
    with open(issues_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['email', 'first_name', 'last_name', 'product_count', 'issue']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_issues)
    
    print(f"✓ Issues report: {issues_file}")
    print(f"  Count: {len(all_issues):,}")
    
    # Show some examples
    if invalid_syntax:
        print(f"\n📋 Sample invalid syntax emails:")
        for customer in invalid_syntax[:5]:
            print(f"  - {customer['email']}")
    
    if disposable:
        print(f"\n📋 Sample disposable emails:")
        for customer in disposable[:5]:
            print(f"  - {customer['email']}")
    
    if test_patterns:
        print(f"\n📋 Sample test pattern emails:")
        for customer in test_patterns[:5]:
            print(f"  - {customer['email']}")
    
    if suspicious:
        print(f"\n📋 Sample suspicious emails:")
        for customer in suspicious[:5]:
            print(f"  - {customer['email']} (reason: {customer['reason']})")
    
    print("\n" + "="*70)
    print("RECOMMENDATIONS")
    print("="*70)
    
    if len(all_issues) > 0:
        issue_percent = len(all_issues) / total * 100
        print(f"\n{len(all_issues):,} potentially fake/invalid emails detected ({issue_percent:.1f}%)")
        print(f"\nRecommendation: Use 'import_customers_high_quality.csv' for import")
        print(f"  - Excludes {len(all_issues):,} problematic emails")
        print(f"  - Retains {len(high_quality_customers):,} high-quality customers")
        
        if len(medium_quality_customers) < len(high_quality_customers) * 0.8:
            diff = len(high_quality_customers) - len(medium_quality_customers)
            print(f"\nAlternative: Use 'import_customers_medium_quality.csv'")
            print(f"  - Only customers with 2+ products (higher engagement)")
            print(f"  - Excludes additional {diff:,} single-product customers")
            print(f"  - More conservative: {len(medium_quality_customers):,} customers")
    else:
        print("\n✓ No major issues detected!")
        print("You can proceed with the original import_customers.csv file")
    
    print("="*70)


if __name__ == '__main__':
    analyze_emails()
    print("\n✓ Email validation complete!")
