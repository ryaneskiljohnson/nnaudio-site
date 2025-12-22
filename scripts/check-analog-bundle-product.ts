import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Checking Analog Plugin Bundle Product ===\n');
  
  const supabase = await createAdminClient();
  
  // Get the product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('slug', 'analog-plugin-bundle')
    .single();
  
  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }
  
  console.log(`Product: ${product.name}`);
  console.log(`  Slug: ${product.slug}`);
  console.log(`  Category: ${product.category}`);
  console.log(`  Status: ${product.status}`);
  console.log(`  Price: ${product.price}`);
  console.log(`  Downloads: ${JSON.stringify(product.downloads, null, 2) || 'None'}`);
  console.log(`  Description: ${product.description ? 'Has description' : 'No description'}`);
  console.log(`  Features: ${product.features ? 'Has features' : 'No features'}\n`);
  
  // Check if it's in any bundle_products (as a product that's part of another bundle)
  const { data: inBundles, error: inBundlesError } = await supabase
    .from('bundle_products')
    .select(`
      bundle:bundles!inner(name, slug)
    `)
    .eq('product_id', product.id);
  
  if (inBundlesError) {
    console.error('Error checking if in bundles:', inBundlesError);
  } else if (inBundles && inBundles.length > 0) {
    console.log(`This product is included in ${inBundles.length} bundle(s):`);
    inBundles.forEach((bp: any) => {
      console.log(`  - ${bp.bundle.name} (${bp.bundle.slug})`);
    });
  } else {
    console.log('This product is not included in any bundles');
  }
}

main().catch(console.error);

