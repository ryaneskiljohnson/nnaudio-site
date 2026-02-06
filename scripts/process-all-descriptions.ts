/**
 * @fileoverview Batch processor for updating all product descriptions
 * @module scripts/process-all-descriptions
 * 
 * This script processes all products that need description updates by:
 * 1. Scraping data from nnaud.io
 * 2. Formatting descriptions
 * 3. Updating the database
 * 4. Logging progress to the markdown tracker
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeEnhancedProduct } from './scrape-enhanced-product';
import { formatDescriptions } from './format-description';

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

const TRACKER_PATH = path.join(process.cwd(), 'PRODUCT_DESCRIPTIONS_PROGRESS.md');
const DELAY_BETWEEN_REQUESTS = 2500; // 2.5 seconds

/**
 * @brief Product data structure from database
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
 * @brief Processing result structure
 */
interface ProcessingResult {
  slug: string;
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  message: string;
  shortLength?: number;
  fullLength?: number;
}

/**
 * @brief Gets all products that need description updates
 * @returns Promise<Product[]> Array of products needing updates
 */
async function getProductsNeedingUpdate(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, category, description, short_description')
    .not('name', 'ilike', '%cymasphere%')
    .not('slug', 'ilike', '%cymasphere%')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  
  if (error) {
    throw error;
  }
  
  // Filter products that need updates
  return (data || []).filter(product => {
    const desc = product.description || '';
    const shortDesc = product.short_description || '';
    
    // Check if needs update
    const isEmpty = desc.length === 0 || shortDesc.length === 0;
    const tooShort = desc.length < 100;
    const hasHtmlEntities = desc.includes('&amp;') || desc.includes('&#') || 
                           shortDesc.includes('&amp;') || shortDesc.includes('&#');
    
    return isEmpty || tooShort || hasHtmlEntities;
  });
}

/**
 * @brief Updates product descriptions in database
 * @param productId Product ID
 * @param shortDesc Short description
 * @param fullDesc Full description
 * @returns Promise<boolean> Success status
 */
async function updateProductDescriptions(
  productId: string,
  shortDesc: string,
  fullDesc: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        short_description: shortDesc,
        description: fullDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`  ✗ Database update failed:`, error);
    return false;
  }
}

/**
 * @brief Updates the markdown tracker with completion status
 * @param slug Product slug
 * @param status Status (completed, failed, skipped)
 */
function updateTracker(slug: string, status: 'completed' | 'failed' | 'skipped') {
  try {
    let content = fs.readFileSync(TRACKER_PATH, 'utf-8');
    
    // Find the line with this slug and update it
    const slugPattern = new RegExp(`^(- \\[ \\] .*?\\(\`${slug}\`\\))(.*)$`, 'gm');
    
    let statusEmoji = '';
    let statusText = '';
    
    switch (status) {
      case 'completed':
        statusEmoji = '✅';
        statusText = ' - Status: ✅ Completed';
        // Change checkbox from [ ] to [x]
        content = content.replace(
          new RegExp(`^- \\[ \\] (.*?\\(\`${slug}\`\\)).*$`, 'gm'),
          `- [x] $1${statusText}`
        );
        break;
      case 'failed':
        statusEmoji = '❌';
        statusText = ' - Status: ❌ Failed';
        content = content.replace(
          new RegExp(`^(- \\[ \\] .*?\\(\`${slug}\`\\)).*$`, 'gm'),
          `$1${statusText}`
        );
        break;
      case 'skipped':
        // Already marked as good, no change needed
        return;
    }
    
    // Update summary counts
    const completedCount = (content.match(/- \[x\].*Status: ✅ Completed/g) || []).length;
    const failedCount = (content.match(/Status: ❌ Failed/g) || []).length;
    
    content = content.replace(
      /^- \*\*Completed Updates\*\*: \d+$/m,
      `- **Completed Updates**: ${completedCount}`
    );
    content = content.replace(
      /^- \*\*Failed\*\*: \d+$/m,
      `- **Failed**: ${failedCount}`
    );
    
    // Update last updated date
    content = content.replace(
      /^Last Updated: .*$/m,
      `Last Updated: ${new Date().toISOString().split('T')[0]}`
    );
    
    fs.writeFileSync(TRACKER_PATH, content, 'utf-8');
  } catch (error) {
    console.error(`  ⚠ Failed to update tracker:`, error);
  }
}

/**
 * @brief Processes a single product
 * @param product Product to process
 * @returns Promise<ProcessingResult> Processing result
 */
async function processProduct(product: Product): Promise<ProcessingResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Processing: ${product.name} (${product.slug})`);
  console.log(`Category: ${product.category}`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    // Step 1: Scrape from nnaud.io
    console.log(`\n[1/3] Scraping from nnaud.io...`);
    const scrapedData = await scrapeEnhancedProduct(product.slug);
    
    if (!scrapedData || (!scrapedData.shortDescription && !scrapedData.fullDescription)) {
      console.log(`  ✗ No data scraped`);
      updateTracker(product.slug, 'failed');
      return {
        slug: product.slug,
        name: product.name,
        status: 'failed',
        message: 'Failed to scrape any descriptions'
      };
    }
    
    // Step 2: Format descriptions
    console.log(`\n[2/3] Formatting descriptions...`);
    const formatted = formatDescriptions(
      scrapedData.shortDescription,
      scrapedData.fullDescription
    );
    
    console.log(`  Short: ${formatted.originalShortLength} → ${formatted.short.length} chars`);
    console.log(`  Full: ${formatted.originalFullLength} → ${formatted.full.length} chars`);
    
    if (!formatted.short || !formatted.full) {
      console.log(`  ✗ Formatting produced empty descriptions`);
      updateTracker(product.slug, 'failed');
      return {
        slug: product.slug,
        name: product.name,
        status: 'failed',
        message: 'Formatting produced empty descriptions'
      };
    }
    
    // Step 3: Update database
    console.log(`\n[3/3] Updating database...`);
    const success = await updateProductDescriptions(
      product.id,
      formatted.short,
      formatted.full
    );
    
    if (!success) {
      updateTracker(product.slug, 'failed');
      return {
        slug: product.slug,
        name: product.name,
        status: 'failed',
        message: 'Database update failed'
      };
    }
    
    console.log(`  ✓ Database updated successfully`);
    
    // Step 4: Update tracker
    updateTracker(product.slug, 'completed');
    
    console.log(`\n✅ ${product.name} completed successfully!`);
    
    return {
      slug: product.slug,
      name: product.name,
      status: 'completed',
      message: 'Successfully updated',
      shortLength: formatted.short.length,
      fullLength: formatted.full.length
    };
    
  } catch (error) {
    console.error(`\n✗ Error processing ${product.name}:`, error);
    updateTracker(product.slug, 'failed');
    return {
      slug: product.slug,
      name: product.name,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * @brief Generates a summary report
 * @param results Array of processing results
 */
function generateReport(results: ProcessingResult[]) {
  const completed = results.filter(r => r.status === 'completed');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  console.log(`\n\n${'='.repeat(70)}`);
  console.log(`BATCH PROCESSING COMPLETE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\nSummary:`);
  console.log(`  Total Processed: ${results.length}`);
  console.log(`  ✅ Completed: ${completed.length}`);
  console.log(`  ❌ Failed: ${failed.length}`);
  console.log(`  ⏭️  Skipped: ${skipped.length}`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Products:`);
    failed.forEach(result => {
      console.log(`  - ${result.name} (${result.slug}): ${result.message}`);
    });
  }
  
  if (completed.length > 0) {
    console.log(`\n✅ Completed Products:`);
    completed.slice(0, 10).forEach(result => {
      console.log(`  - ${result.name}: ${result.shortLength} / ${result.fullLength} chars`);
    });
    if (completed.length > 10) {
      console.log(`  ... and ${completed.length - 10} more`);
    }
  }
  
  console.log(`\n${'='.repeat(70)}\n`);
}

/**
 * @brief Main function
 */
async function main() {
  console.log(`\n🚀 Starting batch description processing...\n`);
  
  // Get products needing update
  console.log(`Fetching products from database...`);
  const products = await getProductsNeedingUpdate();
  console.log(`Found ${products.length} products needing updates\n`);
  
  if (products.length === 0) {
    console.log(`✅ All products have good descriptions! Nothing to do.`);
    return;
  }
  
  // Check if user wants to limit processing
  const limitArg = process.argv[2];
  let productsToProcess = products;
  
  if (limitArg) {
    const limit = parseInt(limitArg, 10);
    if (!isNaN(limit) && limit > 0) {
      productsToProcess = products.slice(0, limit);
      console.log(`⚠️  Limiting to first ${limit} products\n`);
    }
  }
  
  const results: ProcessingResult[] = [];
  
  // Process each product
  for (let i = 0; i < productsToProcess.length; i++) {
    const product = productsToProcess[i];
    console.log(`\n[${i + 1}/${productsToProcess.length}]`);
    
    const result = await processProduct(product);
    results.push(result);
    
    // Rate limiting: wait between requests (except for last one)
    if (i < productsToProcess.length - 1) {
      console.log(`\nWaiting ${DELAY_BETWEEN_REQUESTS / 1000} seconds before next request...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  // Generate final report
  generateReport(results);
  
  // Save detailed log
  const logPath = path.join(process.cwd(), 'description-processing-log.json');
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`📄 Detailed log saved to: ${logPath}\n`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
