import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('status', 'active')
    .order('name');
  
  if (error) {
    throw error;
  }
  
  return data || [];
}

async function scrapeProduct(slug: string) {
  try {
    const { stdout, stderr } = await execAsync(
      `npx tsx scripts/scrape-product-content.ts "${slug}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (stderr && !stderr.includes('DeprecationWarning')) {
      console.error(`  ⚠ Warning for ${slug}:`, stderr);
    }
    
    return true;
  } catch (error: any) {
    console.error(`  ✗ Failed to scrape ${slug}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting batch product scraping...\n');
  
  const products = await getAllProducts();
  console.log(`Found ${products.length} products to scrape\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n[${i + 1}/${products.length}] Processing: ${product.name}`);
    
    const success = await scrapeProduct(product.slug);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to avoid overwhelming the server
    if (i < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Batch scraping complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${products.length}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
