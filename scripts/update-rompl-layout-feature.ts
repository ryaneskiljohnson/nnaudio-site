import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateLayoutFeature() {
  console.log('=== Updating Rompl Layout Feature Image ===\n');

  const adminSupabase = await createAdminClient();

  // Get Rompl Workstation product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features, background_image_url')
    .or('slug.eq.rompl-workstation,slug.eq.rompl,name.ilike.%rompl%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  const updatedFeatures = product.features.map((feature: any) => {
    if (feature.title === 'Intuitive Plugin Layout' && !feature.image_url && product.background_image_url) {
      return {
        ...feature,
        image_url: product.background_image_url
      };
    }
    return feature;
  });

  // Update product
  console.log('Updating product with layout feature image...');
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ features: updatedFeatures })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated "Intuitive Plugin Layout" feature with GUI image!');
}

updateLayoutFeature().catch(console.error);



