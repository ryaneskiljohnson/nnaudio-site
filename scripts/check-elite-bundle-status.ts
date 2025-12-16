import { createAdminClient } from '@/utils/supabase/service';

async function checkEliteBundles() {
  const supabase = await createAdminClient();

  const { data: bundles } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      bundle_subscription_tiers(id),
      bundle_products(
        product:products(id, name, category, featured_image_url, logo_url)
      )
    `);

  const eliteBundles = bundles?.filter(b => (b.bundle_subscription_tiers as any[])?.length > 0) || [];

  for (const bundle of eliteBundles) {
    const allProducts = ((bundle.bundle_products || []) as any[])
      .map((bp: any) => bp.product)
      .filter(p => p);
    
    const bundleProducts = allProducts.filter((p: any) => p.category === 'bundle');
    const nonBundleProducts = allProducts.filter((p: any) => p.category !== 'bundle');
    const withImages = nonBundleProducts.filter((p: any) => p.featured_image_url || p.logo_url);

    console.log(`\n${bundle.name}:`);
    console.log(`  Total: ${allProducts.length}`);
    console.log(`  Bundle products (should be filtered): ${bundleProducts.length}`);
    console.log(`  Non-bundle products: ${nonBundleProducts.length}`);
    console.log(`  Non-bundle with images (for mosaic): ${withImages.length}`);
    
    if (withImages.length === 0) {
      console.log(`  ❌ NO MOSAIC - NEEDS PRODUCTS`);
    }
  }
}

checkEliteBundles().catch(console.error);
