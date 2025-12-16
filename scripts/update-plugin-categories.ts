import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Audio FX Plugins
const audioFxPlugins = [
  'Crystal ball',
  'freelay',
  'curves EQ',
  'Digital echoes delay',
  'freeQ',
  'freeverb',
  'Sterfreeo'
];

// Instrument Plugins
const instrumentPlugins = [
  'perc gadget',
  'Blaque',
  'prodigious',
  'banjo',
  'Apache flute',
  'rompl workstation',
  'evanescence baby grand piano',
  'Digital dreamscape',
  'noker',
  'obscura',
  'strange tingz',
  'reiya',
  'tactures',
  'tetrad',
  'curio',
  'game boi',
  'coyboy harp',
  'Mesosphere',
  'Quoir',
  'Mandolele Mandolin & Ukulele',
  'numb',
  'natura',
  'subflux'
];

// Special case
const applications = [
  'cymasphere'
];

async function updatePluginCategories() {
  console.log('=== Updating Plugin Categories ===\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  // Update Audio FX Plugins
  console.log('Updating Audio FX Plugins...');
  for (const pluginName of audioFxPlugins) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, category')
        .ilike('name', `%${pluginName}%`)
        .limit(10);

      if (error) {
        console.error(`  ✗ Error searching for "${pluginName}":`, error.message);
        errors++;
        continue;
      }

      if (!products || products.length === 0) {
        console.log(`  ⚠ "${pluginName}" not found`);
        notFound++;
        continue;
      }

      for (const product of products) {
        if (product.category !== 'audio-fx-plugin') {
          const { error: updateError } = await supabase
            .from('products')
            .update({ category: 'audio-fx-plugin' })
            .eq('id', product.id);

          if (updateError) {
            console.error(`  ✗ Error updating "${product.name}":`, updateError.message);
            errors++;
          } else {
            console.log(`  ✓ Updated "${product.name}" to Audio FX Plugin`);
            updated++;
          }
        } else {
          console.log(`  - "${product.name}" already has correct category`);
        }
      }
    } catch (error: any) {
      console.error(`  ✗ Exception for "${pluginName}":`, error.message);
      errors++;
    }
  }

  // Update Instrument Plugins
  console.log('\nUpdating Instrument Plugins...');
  for (const pluginName of instrumentPlugins) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, category')
        .ilike('name', `%${pluginName}%`)
        .limit(10);

      if (error) {
        console.error(`  ✗ Error searching for "${pluginName}":`, error.message);
        errors++;
        continue;
      }

      if (!products || products.length === 0) {
        console.log(`  ⚠ "${pluginName}" not found`);
        notFound++;
        continue;
      }

      for (const product of products) {
        if (product.category !== 'instrument-plugin') {
          const { error: updateError } = await supabase
            .from('products')
            .update({ category: 'instrument-plugin' })
            .eq('id', product.id);

          if (updateError) {
            console.error(`  ✗ Error updating "${product.name}":`, updateError.message);
            errors++;
          } else {
            console.log(`  ✓ Updated "${product.name}" to Instrument Plugin`);
            updated++;
          }
        } else {
          console.log(`  - "${product.name}" already has correct category`);
        }
      }
    } catch (error: any) {
      console.error(`  ✗ Exception for "${pluginName}":`, error.message);
      errors++;
    }
  }

  // Update Applications
  console.log('\nUpdating Applications...');
  for (const appName of applications) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, category')
        .ilike('name', `%${appName}%`)
        .limit(10);

      if (error) {
        console.error(`  ✗ Error searching for "${appName}":`, error.message);
        errors++;
        continue;
      }

      if (!products || products.length === 0) {
        console.log(`  ⚠ "${appName}" not found`);
        notFound++;
        continue;
      }

      for (const product of products) {
        if (product.category !== 'application') {
          const { error: updateError } = await supabase
            .from('products')
            .update({ category: 'application' })
            .eq('id', product.id);

          if (updateError) {
            console.error(`  ✗ Error updating "${product.name}":`, updateError.message);
            errors++;
          } else {
            console.log(`  ✓ Updated "${product.name}" to Application`);
            updated++;
          }
        } else {
          console.log(`  - "${product.name}" already has correct category`);
        }
      }
    } catch (error: any) {
      console.error(`  ✗ Exception for "${appName}":`, error.message);
      errors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`✓ Updated: ${updated}`);
  console.log(`⚠ Not found: ${notFound}`);
  console.log(`✗ Errors: ${errors}`);
  console.log('\n=== Done ===');
}

updatePluginCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
