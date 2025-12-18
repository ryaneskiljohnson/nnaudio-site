import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateCrystalBallProduct() {
  const adminSupabase = await createAdminClient();

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

  console.log(`Found product: ${product.name} (${product.id})`);

  // Data from old site: https://nnaud.io/plugins/crystal-ball-magic-effect/
  const updatedData = {
    tagline: 'Unleash The Sorcery Within',
    short_description: 'Magic Multi Effect | Version 1.0.0',
    description: `Here lies a mystical artifact of immense power: the Crystal Ball. This enchanted audio effect plugin, adorned with 10 shimmering knobs, each infused with the essence of dark magic, allows the wielder to summon and manipulate a symphony of otherworldly effects with ease. As if guided by unseen spirits, the Crystal Ball transforms mundane sounds into bewitching audio spells, weaving intricate sonic tapestries that captivate and ensnare the listener.

With the Crystal Ball in your grasp, you become a master conjurer of sound, channeling the arcane forces that lie beyond the veil. Each twist of a knob awakens hidden enchantments, merging ethereal reverb, spectral delay, and mystical modulation into a single, cohesive spell. The luminous interface, glowing with an eerie inner light, responds to your touch, making the manipulation of audio feel as natural as casting a charm. As the Crystal Ball weaves its intricate magic, your music takes on an enchanted life of its own, shimmering with an allure that is both haunting and mesmerizing. Step into the realm of the unknown, and let the Crystal Ball guide your sonic journey through the mystic arts.`,
    features: [
      'Generate Infinite Effects',
      '250 Stock Presets',
      'MIDI CC + Learn',
      'Intuitive GUI',
      '10 Complete Effect Chains',
      'Transform Any Audio Into A Modern Masterpiece',
      'Easily Undo/Redo Any Change, Including The "Magic Button" Generator',
      'Easy-To-Use Preset Browser for Searching & Creating your own presets',
      'Tooltip To Help Learn & Understand The Plugin',
      'Intuitive single window interface & parameters'
    ],
    specifications: {
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'System Requirements': '4GB RAM | 250MB Disk Space',
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: ~50MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools'
    },
    requirements: {
      windows: 'Windows 10+',
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      disk_space: '250MB Disk Space',
      format: 'VST3 | AU'
    }
  };

  // Update the product
  const { data: updatedProduct, error: updateError } = await adminSupabase
    .from('products')
    .update(updatedData)
    .eq('id', product.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Crystal Ball product');
  console.log('Updated fields:', Object.keys(updatedData).join(', '));
}

updateCrystalBallProduct().catch(console.error);

