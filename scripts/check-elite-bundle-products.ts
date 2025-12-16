import { createAdminClient } from '@/utils/supabase/service';

async function checkEliteBundleProducts() {
  const supabase = await createAdminClient();

  // Get elite bundles
  const { data: bundles, error } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      bundle_subscription_tiers(id)
    `);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const eliteBundles = bundles?.filter(b => (b.bundle_subscription_tiers as any[])?.length > 0) || [];

  for (const bundle of eliteBundles) {
    console.log(`\n=== ${bundle.name} ===`);
    
    const { data: bundleProducts, error: bpError } = await supabase
      .from('bundle_products')
      .select(`
        product:products(
          id,
          name,
          category,
          featured_image_url,
          logo_url
        )
      `)
      .eq('bundle_id', bundle.id);

    if (bpError) {
      console.error('Error:', bpError);
      continue;
    }

    const allProducts = (bundleProducts || []).map((bp: any) => bp.product).filter(p => p);
    const bundleProductsOnly = allProducts.filter((p: any) => p.category === 'bundle');
    const nonBundleProducts = allProducts.filter((p: any) => p.category !== 'bundle');
    const withImages = nonBundleProducts.filter((p: any) => p.featured_image_url || p.logo_url);

    console.log(`Total products: ${allProducts.length}`);
    console.log(`Bundle products (filtered out): ${bundleProductsOnly.length}`);
    console.log(`Non-bundle products: ${nonBundleProducts.length}`);
    console.log(`Non-bundle products with images: ${withImages.length}`);
    
    if (withImages.length === 0) {
      console.log('⚠️  NO PRODUCTS WITH IMAGES - MOSAIC WON\'T SHOW');
    }
  }
}

checkEliteBundleProducts().catch(console.error);
