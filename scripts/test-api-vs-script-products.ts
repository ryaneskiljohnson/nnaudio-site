import { createAdminClient } from '@/utils/supabase/service';

async function compareProducts() {
  const supabase = await createAdminClient();

  // Get what the API would return
  const { data: bundles } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      slug,
      bundle_subscription_tiers(id),
      bundle_products(
        product:products(
          id,
          name,
          category,
          featured_image_url,
          logo_url
        )
      )
    `)
    .eq('status', 'active')
    .limit(1);

  if (!bundles || bundles.length === 0) return;

  const bundle = bundles[0];
  const tiers = ((bundle.bundle_subscription_tiers || []) as any[]).filter(t => t.active);
  const isSubscriptionBundle = tiers.length > 0;

  const allProducts = ((bundle.bundle_products || []) as any[])
    .map((bp: any) => bp.product)
    .filter((p: any) => {
      if (!p) return false;
      if (isSubscriptionBundle && p.category === 'bundle') return false;
      return true;
    });
  
  const productsWithImages = allProducts
    .filter((p: any) => p && (p.featured_image_url || p.logo_url));

  console.log(`${bundle.name}:`);
  console.log(`  Script should process: ${productsWithImages.length} products`);
  console.log(`  Each product should have: featured_image_url OR logo_url`);
  
  // Check how many have each type
  const withFeatured = productsWithImages.filter((p: any) => p.featured_image_url).length;
  const withLogo = productsWithImages.filter((p: any) => p.logo_url).length;
  const withBoth = productsWithImages.filter((p: any) => p.featured_image_url && p.logo_url).length;
  
  console.log(`  Products with featured_image_url: ${withFeatured}`);
  console.log(`  Products with logo_url: ${withLogo}`);
  console.log(`  Products with both: ${withBoth}`);
  console.log(`  Products with neither: ${productsWithImages.length - withFeatured - withLogo + withBoth}`);
}

compareProducts().catch(console.error);
