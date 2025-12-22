import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Exporting Plugin and Pack Products to CSV ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all plugin and pack products (excluding bundles)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, price, sale_price, category, status')
    .in('category', ['instrument-plugin', 'audio-fx-plugin', 'pack', 'plugin'])
    .eq('status', 'active')
    .order('name');
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }
  
  console.log(`Found ${products?.length || 0} plugin and pack products\n`);
  
  // Create CSV header
  const csvRows: string[] = [];
  csvRows.push('Name,Slug,Current Price,Current Sale Price,Link,Website Price,Website Sale Price');
  
  // Add each product
  for (const product of products || []) {
    const name = `"${(product.name || '').replace(/"/g, '""')}"`;
    const slug = product.slug || '';
    const price = product.price || '';
    const salePrice = product.sale_price || '';
    const link = ''; // Will be filled in manually
    const websitePrice = ''; // Will be filled in manually
    const websiteSalePrice = ''; // Will be filled in manually
    
    csvRows.push(`${name},${slug},${price},${salePrice},${link},${websitePrice},${websiteSalePrice}`);
  }
  
  // Write to CSV file
  const csvContent = csvRows.join('\n');
  const outputPath = resolve(__dirname, '../products-export.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  
  console.log(`✅ Exported ${products?.length || 0} products to: ${outputPath}`);
  console.log('\nNext steps:');
  console.log('1. Open the CSV file');
  console.log('2. For each product, find the nnaud.io product page');
  console.log('3. Add the full URL to the "Link" column');
  console.log('4. Add the price and sale_price from the website');
}

main().catch(console.error);

