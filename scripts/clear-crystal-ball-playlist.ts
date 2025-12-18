import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function clearCrystalBallPlaylist() {
  const adminSupabase = await createAdminClient();

  // Get the product
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (fetchError || !product) {
    console.error('Error fetching product:', fetchError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})`);
  console.log(`Current audio samples: ${product.audio_samples?.length || 0}`);
  console.log('\n⚠️  Current playlist contains files from other products (Rompl, Tactures)');
  console.log('   Clearing incorrect playlist...\n');

  // Clear the playlist - set to empty array
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ audio_samples: [] })
    .eq('id', product.id);

  if (updateError) {
    console.error('Error updating product:', updateError);
    return;
  }

  console.log('✅ Cleared incorrect playlist');
  console.log('\n📝 Next steps:');
  console.log('   1. Visit the old site: https://nnaud.io/plugins/crystal-ball-magic-effect/');
  console.log('   2. Identify the correct audio demo files for Crystal Ball');
  console.log('   3. Edit the product in the admin panel (/admin/products)');
  console.log('   4. Add the correct audio sample URLs');
}

clearCrystalBallPlaylist().catch(console.error);

