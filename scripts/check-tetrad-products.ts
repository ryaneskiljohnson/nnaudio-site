import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function checkTetradProducts() {
  console.log('=== Checking Tetrad Products ===\n');

  const supabase = await createAdminClient();

  // Check all tetrad products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, status, category, price, featured_image_url')
    .or('slug.ilike.%tetrad%,name.ilike.%tetrad%')
    .order('name');

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  console.log(`Found ${products?.length || 0} Tetrad products:\n`);
  
  products?.forEach((p: any) => {
    console.log(`- ${p.name} (${p.slug})`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Status: ${p.status || 'null'}`);
    console.log(`  Category: ${p.category || 'null'}`);
    console.log(`  Price: $${p.price || 'null'}`);
    console.log(`  Has Image: ${p.featured_image_url ? 'Yes' : 'No'}`);
    console.log('');
  });

  // Check if they're visible in the API
  console.log('\n=== Checking Product Visibility ===\n');
  
  const { data: activeProducts } = await supabase
    .from('products')
    .select('id, name, slug, status')
    .in('slug', ['tetrad-keys', 'tetrad-guitars', 'tetrad-winds'])
    .eq('status', 'active');

  console.log(`Active products: ${activeProducts?.length || 0}`);
  if (activeProducts && activeProducts.length > 0) {
    activeProducts.forEach((p: any) => {
      console.log(`  ✓ ${p.name} (${p.slug})`);
    });
  }

  const { data: draftProducts } = await supabase
    .from('products')
    .select('id, name, slug, status')
    .in('slug', ['tetrad-keys', 'tetrad-guitars', 'tetrad-winds'])
    .eq('status', 'draft');

  console.log(`\nDraft products: ${draftProducts?.length || 0}`);
  if (draftProducts && draftProducts.length > 0) {
    draftProducts.forEach((p: any) => {
      console.log(`  ⚠ ${p.name} (${p.slug}) - needs to be activated`);
    });
  }
}

checkTetradProducts().catch(console.error);

