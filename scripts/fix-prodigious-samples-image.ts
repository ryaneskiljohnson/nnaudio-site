import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function fixSamplesImage() {
  console.log('=== Fixing Prodigious Samples Feature Image ===\n');

  const adminSupabase = await createAdminClient();

  // Get Prodigious product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features, background_image_url')
    .or('slug.eq.prodigious,name.ilike.%prodigious%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Use the GUI/background image for the samples feature since the GIF was too large
  const updatedFeatures = product.features.map((feature: any) => {
    if (feature.title === '32 Sampled Instruments' && !feature.image_url && product.background_image_url) {
      return {
        ...feature,
        image_url: product.background_image_url
      };
    }
    return feature;
  });

  // Update product
  console.log('Updating product with samples feature image...');
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ features: updatedFeatures })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated "32 Sampled Instruments" feature with GUI image!');
  console.log('   (Note: Original GIF was too large for Supabase, using GUI image as fallback)');
}

fixSamplesImage().catch(console.error);



