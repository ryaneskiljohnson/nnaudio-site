import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function fixEvanescentSamplesImage() {
  console.log('=== Fixing Evanescent Samples Feature Image ===\n');

  const adminSupabase = await createAdminClient();

  // Get Evanescent product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features, background_image_url')
    .eq('slug', 'evanescent-baby-grand-piano')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Update the "780 HD Piano Samples" feature with the GUI image as fallback
  const updatedFeatures = (product.features || []).map((feature: any) => {
    if (feature.title === '780 HD Piano Samples' && !feature.image_url) {
      console.log(`Updating "${feature.title}" with GUI image as fallback...`);
      return {
        ...feature,
        image_url: product.background_image_url || ''
      };
    }
    return feature;
  });

  // Update product
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ features: updatedFeatures })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Evanescent "780 HD Piano Samples" feature with GUI image fallback!');
}

fixEvanescentSamplesImage().catch(console.error);



