import { createAdminClient } from '@/utils/supabase/service';

async function debugProducts() {
  const supabase = await createAdminClient();

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
  console.log(`  Total products: ${allProducts.length}`);
  console.log(`  Products with images: ${productsWithImages.length}`);
  console.log(`  Products without images: ${allProducts.length - productsWithImages.length}`);
  
  console.log('\nFirst 10 products:');
  productsWithImages.slice(0, 10).forEach((p: any, i: number) => {
    console.log(`  ${i + 1}. ${p.name}`);
    console.log(`     featured: ${p.featured_image_url ? 'YES' : 'NO'}`);
    console.log(`     logo: ${p.logo_url ? 'YES' : 'NO'}`);
  });
}

debugProducts().catch(console.error);
