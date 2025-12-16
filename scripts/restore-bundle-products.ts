import { createAdminClient } from '@/utils/supabase/service';

async function restoreBundleProducts() {
  const supabase = await createAdminClient();

  // Get Ultimate Bundle
  const { data: ultimateBundle } = await supabase
    .from('bundles')
    .select('id, name')
    .ilike('name', '%ultimate%')
    .single();

  if (!ultimateBundle) {
    console.log('Ultimate Bundle not found');
    return;
  }

  console.log(`Found: ${ultimateBundle.name}`);

  // Get all bundle products (products with category = 'bundle')
  const { data: bundleProducts } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('category', 'bundle')
    .eq('status', 'active');

  if (!bundleProducts || bundleProducts.length === 0) {
    console.log('No bundle products found');
    return;
  }

  console.log(`Found ${bundleProducts.length} bundle products to potentially restore`);

  // Check which ones are already in the bundle
  const { data: existing } = await supabase
    .from('bundle_products')
    .select('product_id')
    .eq('bundle_id', ultimateBundle.id);

  const existingIds = new Set((existing || []).map(e => e.product_id));

  // Add missing bundle products back
  const toAdd = bundleProducts
    .filter(p => !existingIds.has(p.id))
    .map((p, idx) => ({
      bundle_id: ultimateBundle.id,
      product_id: p.id,
      display_order: idx
    }));

  if (toAdd.length === 0) {
    console.log('All bundle products already in bundle');
    return;
  }

  console.log(`Adding ${toAdd.length} bundle products back to ${ultimateBundle.name}...`);

  const { error } = await supabase
    .from('bundle_products')
    .insert(toAdd);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✓ Restored ${toAdd.length} bundle products`);
  }
}

restoreBundleProducts().catch(console.error);
