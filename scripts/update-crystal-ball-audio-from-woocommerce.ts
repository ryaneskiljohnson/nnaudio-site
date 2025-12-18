import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateCrystalBallAudioFromWooCommerce() {
  const adminSupabase = await createAdminClient();

  // Fetch playlist from WooCommerce
  const playlistUrl = 'https://nnaud.io/?load=playlist.json&albums=125808';
  console.log(`Fetching playlist from: ${playlistUrl}`);
  
  const response = await fetch(playlistUrl);
  if (!response.ok) {
    console.error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
    return;
  }

  const playlistData = await response.json();
  const tracks = playlistData.tracks || [];

  console.log(`Found ${tracks.length} tracks in playlist\n`);

  // Get the product
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (fetchError || !product) {
    console.error('Error fetching product:', fetchError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Map tracks to audio_samples format
  const audioSamples = tracks.map((track: any) => ({
    url: track.mp3,
    name: track.track_title || `Track ${track.track_pos + 1}`
  }));

  console.log('Audio samples to add:');
  audioSamples.forEach((audio: any, i: number) => {
    console.log(`  ${i + 1}. ${audio.name}`);
    console.log(`     ${audio.url}`);
  });

  // Update the product
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ audio_samples: audioSamples })
    .eq('id', product.id);

  if (updateError) {
    console.error('\n❌ Error updating product:', updateError);
    return;
  }

  console.log(`\n✅ Successfully updated Crystal Ball audio playlist`);
  console.log(`   Added ${audioSamples.length} audio samples`);
  console.log('\n⚠️  Note: Audio URLs are from the old site (nnaud.io)');
  console.log('   You may want to migrate these files to Supabase Storage for better performance');
}

updateCrystalBallAudioFromWooCommerce().catch(console.error);

