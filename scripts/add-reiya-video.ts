import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function addReiyaVideo() {
  console.log('=== Adding Reiya Demo Video ===\n');

  const adminSupabase = await createAdminClient();

  // Get Reiya product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'reiya')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Demo video URL from old site
  const demoVideoUrl = 'https://www.youtube.com/watch?v=ck_lV_NuPmM&t=61s';

  // Update product with demo video URL
  console.log('Updating product with demo video URL...');
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ demo_video_url: demoVideoUrl })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log(`✅ Successfully added demo video URL: ${demoVideoUrl}`);
}

addReiyaVideo().catch(console.error);



