/**
 * @fileoverview Script to update all Orbitals products to use 'midi-fx-plugin' category
 * @module scripts/update-orbitals-to-midi-fx
 */

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

/**
 * @brief List of Orbitals product slugs
 * @type {string[]}
 */
const orbitalsSlugs = ['tidal', 'apogee', 'lagrange', 'eclipse', 'ion', 'perihelion', 'retrograde', 'kepler'];

/**
 * @brief Updates all Orbitals products to use 'midi-fx-plugin' category
 * @returns {Promise<void>}
 */
async function updateOrbitalsToMidiFx() {
  console.log('=== Updating Orbitals Products to MIDI FX Plugin Category ===\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  let alreadyCorrect = 0;

  for (const slug of orbitalsSlugs) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, slug, category')
        .eq('slug', slug)
        .limit(1);

      if (error) {
        console.error(`  ✗ Error searching for "${slug}":`, error.message);
        errors++;
        continue;
      }

      if (!products || products.length === 0) {
        console.log(`  ⚠ Product with slug "${slug}" not found`);
        notFound++;
        continue;
      }

      const product = products[0];
      
      if (product.category === 'midi-fx-plugin') {
        console.log(`  - "${product.name}" already has correct category (midi-fx-plugin)`);
        alreadyCorrect++;
      } else {
        const { error: updateError } = await supabase
          .from('products')
          .update({ category: 'midi-fx-plugin' })
          .eq('id', product.id);

        if (updateError) {
          console.error(`  ✗ Error updating "${product.name}":`, updateError.message);
          errors++;
        } else {
          console.log(`  ✓ Updated "${product.name}" (${slug}) from "${product.category}" to "midi-fx-plugin"`);
          updated++;
        }
      }
    } catch (error: any) {
      console.error(`  ✗ Exception for "${slug}":`, error.message);
      errors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`✓ Updated: ${updated}`);
  console.log(`- Already correct: ${alreadyCorrect}`);
  console.log(`⚠ Not found: ${notFound}`);
  console.log(`✗ Errors: ${errors}`);
  console.log('\n=== Done ===');
}

updateOrbitalsToMidiFx()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
