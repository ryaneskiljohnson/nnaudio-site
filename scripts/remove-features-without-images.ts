import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function removeFeaturesWithoutImages() {
  console.log('=== Removing Features Without Images for Crystal Ball ===\n');

  const adminSupabase = await createAdminClient();

  // Get Crystal Ball product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})`);
  console.log(`Current features count: ${product.features?.length || 0}\n`);

  if (!product.features || !Array.isArray(product.features)) {
    console.log('No features to process.');
    return;
  }

  // Filter features to keep only those with images
  const featuresWithImages = product.features.filter((feature: any) => {
    if (typeof feature === 'string') {
      return false; // String features don't have images
    }
    
    const hasImage = feature.image_url && feature.image_url.trim() !== '' ||
                     feature.gif_url && feature.gif_url.trim() !== '' ||
                     feature.image && feature.image.trim() !== '';
    
    return hasImage;
  });

  console.log(`Features with images: ${featuresWithImages.length}`);
  console.log(`Features without images (removed): ${product.features.length - featuresWithImages.length}\n`);

  if (featuresWithImages.length === product.features.length) {
    console.log('✅ All features already have images. No changes needed.');
    return;
  }

  // List features being removed
  const removedFeatures = product.features.filter((feature: any) => {
    if (typeof feature === 'string') {
      return true;
    }
    const hasImage = feature.image_url && feature.image_url.trim() !== '' ||
                     feature.gif_url && feature.gif_url.trim() !== '' ||
                     feature.image && feature.image.trim() !== '';
    return !hasImage;
  });

  console.log('Features being removed:');
  removedFeatures.forEach((feature: any) => {
    const title = typeof feature === 'string' ? feature : (feature.title || feature.name || 'Unknown');
    console.log(`  - ${title}`);
  });
  console.log('');

  // Update product with filtered features
  console.log('Updating product...');
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ features: featuresWithImages })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully removed features without images!');
  console.log(`   Remaining features: ${featuresWithImages.length}`);
}

removeFeaturesWithoutImages().catch(console.error);

