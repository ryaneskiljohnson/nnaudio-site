import dotenv from 'dotenv';
import { resolve } from 'path';
import { createAdminClient } from '@/utils/supabase/service';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function shortenTetradBundleDescription() {
  console.log('=== Shortening Tetrad Bundle Description ===\n');

  const adminSupabase = await createAdminClient();

  // Get Tetrad bundle
  const { data: bundle, error: bundleError } = await adminSupabase
    .from('bundles')
    .select('id, name, slug')
    .eq('slug', 'tetrad-bundle')
    .single();

  if (bundleError || !bundle) {
    console.error('❌ Error fetching bundle:', bundleError);
    return;
  }

  console.log(`Found bundle: ${bundle.name} (${bundle.id})\n`);

  // Shortened descriptions
  const shortDescription = 'Get all three Tetrad plugins - Keys, Guitars, and Winds - in one complete bundle. Blend analog, digital, and live-recorded instruments with four sound engines per plugin.';
  
  const description = `Get all three Tetrad plugins - Keys, Guitars, and Winds - in one complete bundle.

**Tetrad Keys** - Blend analog keys, digital synths, and live-recorded piano with four editable sound engines.

**Tetrad Guitars** - Combine analog, digital, and live-recorded guitar tones with four blendable sources.

**Tetrad Winds** - Mix analog, digital, and live-recorded wind instruments with four independent sound engines.

Each plugin features individually editable controls and built-in FX modules.`;

  // Update bundle
  const { error: updateError } = await adminSupabase
    .from('bundles')
    .update({
      short_description: shortDescription,
      description: description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bundle.id);

  if (updateError) {
    console.error('❌ Error updating bundle:', updateError);
    return;
  }

  console.log('✅ Successfully shortened Tetrad bundle description!');
  console.log(`\nShort Description (${shortDescription.length} chars):`);
  console.log(`  ${shortDescription}`);
  console.log(`\nFull Description (${description.length} chars):`);
  console.log(`  ${description}`);
}

shortenTetradBundleDescription().catch(console.error);
