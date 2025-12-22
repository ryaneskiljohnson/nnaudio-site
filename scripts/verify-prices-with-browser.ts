import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Verifying Product Prices Using Browser MCP ===\n');
  console.log('This script will use browser MCP to check each product page.\n');
  console.log('NOTE: You will need to run browser MCP commands manually for each product.\n');
  console.log('The script will output the product list with their current DB prices.\n');
  
  const supabase = await createAdminClient();
  
  // Get all active products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, price, sale_price, status')
    .eq('status', 'active')
    .order('name');
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }
  
  console.log(`Found ${products?.length || 0} active products\n`);
  console.log('Product list with current prices:\n');
  
  for (let i = 0; i < (products || []).length; i++) {
    const product = products![i];
    console.log(`[${i + 1}/${products!.length}] ${product.name}`);
    console.log(`  Slug: ${product.slug}`);
    console.log(`  URL: https://nnaud.io/product/${product.slug}/`);
    console.log(`  Current DB: price=$${product.price}, sale_price=${product.sale_price ? '$' + product.sale_price : 'null'}`);
    console.log('');
  }
  
  console.log('\n=== Instructions ===');
  console.log('For each product, use browser MCP to:');
  console.log('1. Navigate to the product URL');
  console.log('2. Extract the price and sale_price from the page');
  console.log('3. Update the database if prices differ');
  console.log('\nThe script will be updated to automate this process.');
}

main().catch(console.error);

