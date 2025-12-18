import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function addVideoUrl() {
  console.log('=== Adding Crystal Ball Demo Video URL ===\n');

  const adminSupabase = await createAdminClient();

  // Get Crystal Ball product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, demo_video_url')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})`);
  console.log(`Current demo_video_url: ${product.demo_video_url || 'null'}\n`);

  // YouTube video URL from old site: https://youtu.be/xjPXoZQWWbI
  const videoUrl = 'https://youtu.be/xjPXoZQWWbI';

  if (product.demo_video_url === videoUrl) {
    console.log('✅ Video URL already set correctly.');
    return;
  }

  console.log(`Updating demo_video_url to: ${videoUrl}`);
  
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ demo_video_url: videoUrl })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Crystal Ball with demo video URL!');
  console.log(`   Video URL: ${videoUrl}`);
}

addVideoUrl().catch(console.error);

