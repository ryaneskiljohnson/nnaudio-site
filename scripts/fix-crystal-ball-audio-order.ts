import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function fixCrystalBallAudioOrder() {
  const adminSupabase = await createAdminClient();

  // Fetch playlist from WooCommerce with correct order
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

  // Sort by track_pos to ensure correct order
  const sortedTracks = [...tracks].sort((a: any, b: any) => {
    const posA = a.track_pos ?? 999;
    const posB = b.track_pos ?? 999;
    return posA - posB;
  });

  console.log('Correct order (sorted by track_pos):');
  sortedTracks.forEach((track: any, i: number) => {
    console.log(`  ${i + 1}. [pos: ${track.track_pos}] ${track.track_title}`);
  });

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

  console.log(`\nFound product: ${product.name} (${product.id})`);
  console.log(`Current audio samples: ${product.audio_samples?.length || 0}\n`);

  // Map tracks to audio_samples format in correct order
  const audioSamples = sortedTracks.map((track: any) => ({
    url: track.mp3,
    name: track.track_title || `Track ${track.track_pos + 1}`
  }));

  console.log('\nNew order to save:');
  audioSamples.forEach((audio: any, i: number) => {
    console.log(`  ${i + 1}. ${audio.name}`);
  });

  // Check if order needs updating
  const currentOrder = (product.audio_samples || []).map((a: any) => a.name).join('|');
  const newOrder = audioSamples.map((a: any) => a.name).join('|');
  
  if (currentOrder === newOrder) {
    console.log('\n✅ Audio tracks are already in the correct order');
    return;
  }

  console.log('\n⚠️  Order differs, updating...');

  // Update the product with correctly ordered audio samples
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ audio_samples: audioSamples })
    .eq('id', product.id);

  if (updateError) {
    console.error('\n❌ Error updating product:', updateError);
    return;
  }

  console.log(`\n✅ Successfully updated Crystal Ball audio playlist order`);
  console.log(`   Reordered ${audioSamples.length} audio samples`);
}

fixCrystalBallAudioOrder().catch(console.error);

