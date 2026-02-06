/**
 * @fileoverview Verification script to check all product descriptions meet requirements
 * @module scripts/verify-descriptions
 * 
 * This script verifies that all products have:
 * - Non-empty descriptions
 * - No HTML entities
 * - Proper length (short: 50-300 chars, full: 200-800 chars)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * @brief Product data structure
 */
interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  short_description: string | null;
}

/**
 * @brief Verification issue structure
 */
interface VerificationIssue {
  product: string;
  slug: string;
  category: string;
  issues: string[];
  severity: 'error' | 'warning';
}

/**
 * @brief Checks if text contains HTML entities
 * @param text Text to check
 * @returns True if HTML entities found
 */
function hasHtmlEntities(text: string): boolean {
  return /&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/i.test(text);
}

/**
 * @brief Verifies a single product's descriptions
 * @param product Product to verify
 * @returns Array of issues found (empty if no issues)
 */
function verifyProduct(product: Product): VerificationIssue | null {
  const issues: string[] = [];
  let severity: 'error' | 'warning' = 'warning';
  
  const desc = product.description || '';
  const shortDesc = product.short_description || '';
  
  // Check for empty descriptions
  if (desc.length === 0) {
    issues.push('Missing full description');
    severity = 'error';
  }
  
  if (shortDesc.length === 0) {
    issues.push('Missing short description');
    severity = 'error';
  }
  
  // Check for HTML entities
  if (hasHtmlEntities(desc)) {
    issues.push('Full description contains HTML entities');
    severity = 'error';
  }
  
  if (hasHtmlEntities(shortDesc)) {
    issues.push('Short description contains HTML entities');
    severity = 'error';
  }
  
  // Check length requirements
  if (shortDesc.length > 0 && shortDesc.length < 50) {
    issues.push(`Short description too short (${shortDesc.length} chars, min 50)`);
    severity = 'warning';
  }
  
  if (shortDesc.length > 300) {
    issues.push(`Short description too long (${shortDesc.length} chars, max 300)`);
    severity = 'warning';
  }
  
  if (desc.length > 0 && desc.length < 200) {
    issues.push(`Full description too short (${desc.length} chars, min 200)`);
    severity = 'warning';
  }
  
  if (desc.length > 800) {
    issues.push(`Full description too long (${desc.length} chars, max 800)`);
    severity = 'warning';
  }
  
  // Return null if no issues
  if (issues.length === 0) {
    return null;
  }
  
  return {
    product: product.name,
    slug: product.slug,
    category: product.category,
    issues,
    severity
  };
}

/**
 * @brief Generates a verification report
 * @param allIssues Array of all issues found
 * @returns Formatted report string
 */
function generateReport(allIssues: VerificationIssue[]): string {
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  
  let report = '';
  
  report += `\n${'='.repeat(70)}\n`;
  report += `PRODUCT DESCRIPTION VERIFICATION REPORT\n`;
  report += `${'='.repeat(70)}\n\n`;
  
  report += `Summary:\n`;
  report += `  Total Issues: ${allIssues.length}\n`;
  report += `  ❌ Errors: ${errors.length}\n`;
  report += `  ⚠️  Warnings: ${warnings.length}\n\n`;
  
  if (allIssues.length === 0) {
    report += `✅ All products have valid descriptions!\n\n`;
    report += `${'='.repeat(70)}\n\n`;
    return report;
  }
  
  if (errors.length > 0) {
    report += `\n❌ ERRORS (${errors.length}):\n`;
    report += `${'='.repeat(70)}\n\n`;
    
    errors.forEach(issue => {
      report += `Product: ${issue.product} (${issue.slug})\n`;
      report += `Category: ${issue.category}\n`;
      report += `Issues:\n`;
      issue.issues.forEach(i => {
        report += `  • ${i}\n`;
      });
      report += `\n`;
    });
  }
  
  if (warnings.length > 0) {
    report += `\n⚠️  WARNINGS (${warnings.length}):\n`;
    report += `${'='.repeat(70)}\n\n`;
    
    warnings.forEach(issue => {
      report += `Product: ${issue.product} (${issue.slug})\n`;
      report += `Category: ${issue.category}\n`;
      report += `Issues:\n`;
      issue.issues.forEach(i => {
        report += `  • ${i}\n`;
      });
      report += `\n`;
    });
  }
  
  report += `${'='.repeat(70)}\n\n`;
  
  return report;
}

/**
 * @brief Main function
 */
async function main() {
  console.log(`\n🔍 Starting product description verification...\n`);
  
  // Get all products (excluding Cymasphere)
  console.log(`Fetching products from database...`);
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, description, short_description')
    .not('name', 'ilike', '%cymasphere%')
    .not('slug', 'ilike', '%cymasphere%')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  
  if (error) {
    console.error('✗ Failed to fetch products:', error);
    process.exit(1);
  }
  
  if (!products || products.length === 0) {
    console.log('✗ No products found');
    process.exit(1);
  }
  
  console.log(`Found ${products.length} products to verify\n`);
  
  // Verify each product
  const allIssues: VerificationIssue[] = [];
  
  for (const product of products) {
    const issue = verifyProduct(product);
    if (issue) {
      allIssues.push(issue);
    }
  }
  
  // Generate and display report
  const report = generateReport(allIssues);
  console.log(report);
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'description-verification-report.txt');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Report saved to: ${reportPath}\n`);
  
  // Exit with error code if there are errors
  const hasErrors = allIssues.some(i => i.severity === 'error');
  if (hasErrors) {
    console.log(`❌ Verification failed with ${allIssues.filter(i => i.severity === 'error').length} errors\n`);
    process.exit(1);
  } else if (allIssues.length > 0) {
    console.log(`⚠️  Verification completed with ${allIssues.length} warnings\n`);
    process.exit(0);
  } else {
    console.log(`✅ Verification passed! All products have valid descriptions.\n`);
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
