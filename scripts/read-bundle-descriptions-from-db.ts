import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Reading Bundle Descriptions from Database ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all bundle products with their descriptions
  const { data: bundleProducts, error: bundleError } = await supabase
    .from('products')
    .select('id, name, slug, description, short_description')
    .eq('category', 'bundle')
    .order('name');
  
  if (bundleError) {
    console.error('Error fetching bundle products:', bundleError);
    return;
  }
  
  // Get all products for matching
  const { data: allProducts, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, category')
    .eq('status', 'active')
    .neq('category', 'bundle');
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }
  
  console.log(`Found ${bundleProducts?.length || 0} bundle products\n`);
  
  for (const bundle of bundleProducts || []) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${bundle.name} (${bundle.slug})`);
    console.log(`\nDescription:`);
    console.log(bundle.description || bundle.short_description || 'No description');
    
    // Try to extract product names from description
    const desc = (bundle.description || bundle.short_description || '').toLowerCase();
    const mentionedProducts: any[] = [];
    
    allProducts?.forEach(product => {
      const productNameLower = product.name.toLowerCase();
      // Check if product name appears in description
      if (desc.includes(productNameLower) || desc.includes(product.slug.toLowerCase())) {
        mentionedProducts.push(product);
      }
    });
    
    if (mentionedProducts.length > 0) {
      console.log(`\nProducts mentioned in description:`);
      mentionedProducts.forEach(p => {
        console.log(`  - ${p.name} (${p.slug})`);
      });
    }
  }
}

main().catch(console.error);

