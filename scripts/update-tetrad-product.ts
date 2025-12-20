import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateTetradProduct() {
  console.log('=== Updating Tetrad Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Tetrad product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'tetrad-series')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Blended Instrument Series',
    short_description: 'Fuse the warmth and character of analog gear, the versatility of digital synthesis, and the organic essence of live recordings. Immerse yourself in a sonic realm where vintage analog textures, cutting-edge digital tones, and real-world performances coalesce to inspire creativity like never before. From lush pads and rich textures to expressive leads and vibrant melodic instruments. Create captivating soundscapes with depth, character, and an unmistakable modern edge.',
    description: `Fuse the warmth and character of analog gear, the versatility of digital synthesis, and the organic essence of live recordings. Immerse yourself in a sonic realm where vintage analog textures, cutting-edge digital tones, and real-world performances coalesce to inspire creativity like never before. From lush pads and rich textures to expressive leads and vibrant melodic instruments. Create captivating soundscapes with depth, character, and an unmistakable modern edge.

Embrace The Harmonious Blend Of Sonic Worlds

Introducing the Tetrad – Blended Instruments Series, a trio of innovative plugins comprising Tetrad Keys, Tetrad Guitars, and Tetrad Winds. These plugins redefine the concept of "Blended Instruments" by seamlessly incorporating analog, digital, and live-recorded instrument samples. With up to four sound engines per plugin, users have the power to blend diverse instruments to create rich, layered sounds. Each sound engine is individually editable, allowing for precise customization of tones and textures.

Enhance your creative journey with Tetrad's built-in FX modules, providing comprehensive control and endless possibilities for sound design. From lush reverbs to intricate delays, these plugins offer a suite of effects to shape your music. Unleash your creativity and explore the boundless potential of Tetrad – a series that brings the best of analog, digital, and live instruments into one harmonious blend.

Tetrad: Keys

Unleash the soulful resonance of Tetrad Keys, a revolutionary plugin that fuses the warmth of analog keys, the precision of digital synths, and the authenticity of live-recorded piano. With four sound engines at your fingertips, blend these sonic elements to craft rich and expressive key arrangements. Each sound engine is individually editable, allowing you to fine-tune the character, attack, and resonance of your keys. Tetrad Keys introduces a new era of versatility in keyboard sound design, providing a seamless blend of traditional and modern tones.

Tetrad: Guitars

Dive into the world of Tetrad Guitars, where analog, digital, and live-recorded guitar tones converge to create a rich palette of sounds. This plugin offers the flexibility to blend up to four guitar sources, each with its unique timbre and character. Individually edit these sources to perfect your tone, adjusting elements like attack, sustain, and tuning. Tetrad Guitars is your gateway to crafting dynamic and expressive guitar compositions, from classic riffs to experimental textures.

Tetrad: Winds

Tetrad Winds redefines wind instrument emulation by combining the nuances of analog, digital, and live-recorded wind instruments in a single plugin. With four sound engines, users can seamlessly blend an array of woodwind instruments to create harmonically rich wind arrangements. Each sound engine is independently editable, allowing precise control over your sound elements. Tetrad Winds opens a world of possibilities for composers and producers seeking authentic and versatile wind instrument sounds in their musical creations.`,
    features: [
      {
        title: 'Tetrad: Keys',
        description: 'Unleash the soulful resonance of Tetrad Keys, a revolutionary plugin that fuses the warmth of analog keys, the precision of digital synths, and the authenticity of live-recorded piano. With four sound engines at your fingertips, blend these sonic elements to craft rich and expressive key arrangements. Each sound engine is individually editable, allowing you to fine-tune the character, attack, and resonance of your keys. Tetrad Keys introduces a new era of versatility in keyboard sound design, providing a seamless blend of traditional and modern tones.',
        image_url: ''
      },
      {
        title: 'Tetrad: Guitars',
        description: 'Dive into the world of Tetrad Guitars, where analog, digital, and live-recorded guitar tones converge to create a rich palette of sounds. This plugin offers the flexibility to blend up to four guitar sources, each with its unique timbre and character. Individually edit these sources to perfect your tone, adjusting elements like attack, sustain, and tuning. Tetrad Guitars is your gateway to crafting dynamic and expressive guitar compositions, from classic riffs to experimental textures.',
        image_url: ''
      },
      {
        title: 'Tetrad: Winds',
        description: 'Tetrad Winds redefines wind instrument emulation by combining the nuances of analog, digital, and live-recorded wind instruments in a single plugin. With four sound engines, users can seamlessly blend an array of woodwind instruments to create harmonically rich wind arrangements. Each sound engine is independently editable, allowing precise control over your sound elements. Tetrad Winds opens a world of possibilities for composers and producers seeking authentic and versatile wind instrument sounds in their musical creations.',
        image_url: ''
      }
    ],
    requirements: {
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      format: 'VST3 | AU',
      windows: 'Windows 10+',
      disk_space: '3GB Disk Space'
    },
    specifications: {
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: 237MB | Samples: 1.3GB',
      'Delivery Format': 'WIN: EXE | MAC: PKG, Samples: ZIP',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
      'System Requirements': '4GB RAM | 3GB Disk Space'
    }
  };

  // Update product
  console.log('Updating product data...');
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({
      tagline: productData.tagline,
      short_description: productData.short_description,
      description: productData.description,
      features: productData.features,
      requirements: productData.requirements,
      specifications: productData.specifications
    })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Tetrad product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateTetradProduct().catch(console.error);



