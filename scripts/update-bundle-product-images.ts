import { createAdminClient } from '@/utils/supabase/service';

async function updateBundleProductImages() {
  const supabase = await createAdminClient();

  // Get the bundles to get their featured_image_url
  const { data: bundles } = await supabase
    .from('bundles')
    .select('id, name, featured_image_url')
    .in('name', ['Ultimate Bundle', "Producer's Arsenal", 'Beat Lab']);

  if (!bundles || bundles.length === 0) {
    console.log('No bundles found');
    return;
  }

  for (const bundle of bundles) {
    if (!bundle.featured_image_url) {
      console.log(`⚠️  ${bundle.name} has no featured_image_url`);
      continue;
    }

    // Find the product with the same name
    const { data: product, error: findError } = await supabase
      .from('products')
      .select('id, name, featured_image_url')
      .ilike('name', `%${bundle.name}%`)
      .eq('category', 'bundle')
      .single();

    if (findError || !product) {
      console.log(`⚠️  Could not find product for ${bundle.name}`);
      continue;
    }

    // Update the product with the bundle's featured_image_url
    const { error: updateError } = await supabase
      .from('products')
      .update({ featured_image_url: bundle.featured_image_url })
      .eq('id', product.id);

    if (updateError) {
      console.error(`❌ Error updating ${bundle.name}:`, updateError);
    } else {
      console.log(`✓ Updated ${bundle.name} product with image: ${bundle.featured_image_url}`);
    }
  }
}

updateBundleProductImages().catch(console.error);
