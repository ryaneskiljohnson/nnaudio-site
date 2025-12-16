import { createAdminClient } from '@/utils/supabase/service';

async function checkUltimateBundleProducts() {
  const supabase = await createAdminClient();

  const { data: bundle } = await supabase
    .from('bundles')
    .select('id, name')
    .ilike('name', '%ultimate%')
    .single();

  if (!bundle) {
    console.log('Ultimate Bundle not found');
    return;
  }

  const { data: bundleProducts } = await supabase
    .from('bundle_products')
    .select(`
      product:products(
        id,
        name,
        featured_image_url,
        logo_url,
        category
      )
    `)
    .eq('bundle_id', bundle.id)
    .limit(20);

  console.log(`\nChecking first 20 products in ${bundle.name}:\n`);
  
  const products = (bundleProducts || []).map((bp: any) => bp.product).filter(p => p);
  
  let withFeatured = 0;
  let withLogo = 0;
  let withBoth = 0;
  let withNeither = 0;

  products.forEach((p: any) => {
    const hasFeatured = !!p.featured_image_url;
    const hasLogo = !!p.logo_url;
    
    if (hasFeatured && hasLogo) withBoth++;
    else if (hasFeatured) withFeatured++;
    else if (hasLogo) withLogo++;
    else withNeither++;
    
    if (!hasFeatured && !hasLogo) {
      console.log(`  ❌ ${p.name} (${p.category}) - NO IMAGES`);
    }
  });

  console.log(`\nSummary:`);
  console.log(`  With featured_image_url: ${withFeatured + withBoth}`);
  console.log(`  With logo_url: ${withLogo + withBoth}`);
  console.log(`  With both: ${withBoth}`);
  console.log(`  With neither: ${withNeither}`);
}

checkUltimateBundleProducts().catch(console.error);
