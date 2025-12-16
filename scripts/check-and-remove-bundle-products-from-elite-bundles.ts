import { createAdminClient } from '@/utils/supabase/service';

async function checkAndRemoveBundleProducts() {
  const supabase = await createAdminClient();

  // Get all elite bundles (bundles with subscription tiers)
  const { data: eliteBundles, error: bundlesError } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      bundle_subscription_tiers(id)
    `);

  if (bundlesError) {
    console.error('Error fetching bundles:', bundlesError);
    return;
  }

  // Filter to only bundles with subscription tiers (elite bundles)
  const eliteBundleIds = eliteBundles
    ?.filter(b => (b.bundle_subscription_tiers as any[])?.length > 0)
    .map(b => b.id) || [];

  console.log(`Found ${eliteBundleIds.length} elite bundles`);

  for (const bundleId of eliteBundleIds) {
    const bundle = eliteBundles?.find(b => b.id === bundleId);
    console.log(`\nChecking bundle: ${bundle?.name}`);

    // Get all products in this bundle
    const { data: bundleProducts, error: productsError } = await supabase
      .from('bundle_products')
      .select(`
        id,
        product_id,
        product:products!inner(
          id,
          name,
          category
        )
      `)
      .eq('bundle_id', bundleId);

    if (productsError) {
      console.error(`Error fetching products for ${bundle?.name}:`, productsError);
      continue;
    }

    // Find products that are bundles (category === 'bundle')
    const bundleProductEntries = (bundleProducts || []).filter(
      (bp: any) => bp.product?.category === 'bundle'
    );

    if (bundleProductEntries.length === 0) {
      console.log(`  ✓ No bundle products found`);
      continue;
    }

    console.log(`  ⚠ Found ${bundleProductEntries.length} bundle product(s) to remove:`);
    bundleProductEntries.forEach((bp: any) => {
      console.log(`    - ${bp.product?.name} (${bp.product?.category})`);
    });

    // Remove bundle products from elite bundle
    const bundleProductIds = bundleProductEntries.map((bp: any) => bp.id);
    
    const { error: deleteError } = await supabase
      .from('bundle_products')
      .delete()
      .in('id', bundleProductIds);

    if (deleteError) {
      console.error(`  ✗ Error removing bundle products:`, deleteError);
    } else {
      console.log(`  ✓ Removed ${bundleProductIds.length} bundle product(s)`);
    }
  }

  console.log('\n✓ Done checking and removing bundle products from elite bundles');
}

checkAndRemoveBundleProducts().catch(console.error);

