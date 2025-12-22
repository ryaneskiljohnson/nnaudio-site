import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Fixing Analog Plugin Bundle ===\n');
  
  const supabase = await createAdminClient();
  
  // Get the bundle
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .select('id, name, slug')
    .eq('slug', 'analog-plugin-bundle')
    .single();
  
  if (bundleError || !bundle) {
    console.error('Error fetching bundle:', bundleError);
    return;
  }
  
  console.log(`Bundle: ${bundle.name}\n`);
  
  // Analog plugins are typically vintage/warm/tape-style effects
  // Based on common analog plugin categories, these might be:
  // - Tape effects
  // - Vintage-style EQs
  // - Warm saturation plugins
  // - Analog-style delays/reverbs
  
  // Let's check what FX plugins exist that might be analog-themed
  const { data: fxPlugins, error: pluginsError } = await supabase
    .from('products')
    .select('id, name, slug, category, description')
    .eq('category', 'audio-fx-plugin')
    .eq('status', 'active');
  
  if (pluginsError) {
    console.error('Error fetching plugins:', pluginsError);
    return;
  }
  
  console.log(`Found ${fxPlugins?.length || 0} FX plugins\n`);
  console.log('Available FX plugins:');
  fxPlugins?.forEach(p => {
    console.log(`  - ${p.name} (${p.slug})`);
    if (p.description) {
      const descLower = p.description.toLowerCase();
      if (descLower.includes('analog') || descLower.includes('vintage') || descLower.includes('tape') || descLower.includes('warm')) {
        console.log(`    ⭐ Might be analog-themed`);
      }
    }
  });
  
  console.log(`\n⚠️  Need to determine which plugins belong in Analog Plugin Bundle.`);
  console.log(`   Common analog plugins might include:`);
  console.log(`   - Tape saturation/effects`);
  console.log(`   - Vintage EQs`);
  console.log(`   - Warm compressors`);
  console.log(`   - Analog-style delays/reverbs`);
}

main().catch(console.error);

