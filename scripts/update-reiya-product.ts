import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateReiyaProduct() {
  console.log('=== Updating Reiya Product ===\n');

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

  // Product data from old site
  const productData: any = {
    tagline: 'Layered Sampled Instruments',
    short_description: 'Reiya is a Japanese word meaning "Layers" and is the perfect way to describe the best technique to use with this plugin. LAYERS ON LAYERS ON LAYERS! 4 of them to be exact. By allowing you to layer multiple sounds, you can have full control over your very own sound design and development!',
    description: `Reiya is a Japanese word meaning "Layers" and is the perfect way to describe the best technique to use with this plugin. LAYERS ON LAYERS ON LAYERS! 4 of them to be exact. By allowing you to layer multiple sounds, you can have full control over your very own sound design and development! You know what that means…? YOU CAN BE EVEN MORE ORIGINAL & BE YOUR OWN SOUND DESIGNER!

Say "Hello" to your new favorite Sound Development Tool, Reiya.

Reiya is a Multi Sampler Engine that allows you to combine 4 total samples to create 1 unique sound. With nearly 200 total samples including Guitars, Synths, Wind Instruments, Percussion, Textures, Toys & more, you will have no trouble finding something to tweak, layer and make your own. With a smooth and easy-to-navigate interface, you will be creating your own unique style in a matter of minutes. Even if you are not in the mood or zone to create your own sounds, you will find Reiya loaded with over 200 original presets.

By having total control of each samples Envelope and EQ, creating & sculpting your initial sound is as easy as 1-2-3.

1. Choose your Samples 2. Use the Envelope for initial sound sculpting 3. Use EQ to further sculpt your sound

Just like that, you have added Sound Design to your resume!

Of course, you can take things further by panning, gain staging, transposing and detuning your samples as well. You can also add some unique twist and dimension with our Built In FX Panel. This FX Panel contains 2 Main Multi FX Knobs. By turning these single knobs you control nearly 20 parameters across 7 different FX within the plugin. You can then fine-tune these FX by adding various LFOs, Filters & FX Specific Parameters (like Delay Time).

Dimension Main Knob – Saturator, Compressor, Stereo Expander, Limiter Space & Time Main Knob – Delay, Reverb, Chorus

The key to a successful Artist or Producer is ORIGINALITY. It is time to begin creating your own sound, style, and vibe. Reiya is here to make that easy. Use Reiya in your productions and let your originality show!`,
    features: [
      {
        title: '4 Sampler Engines',
        description: 'Reiya features four powerful sampler engines, each capable of loading one of nearly 200 meticulously crafted multi-sampled instruments. This allows you to layer up to four different sounds simultaneously, creating complex and unique textures. Each engine provides individual control over envelope, EQ, panning, gain, transpose, and detune, giving you complete creative freedom to sculpt your sound.',
        image_url: ''
      },
      {
        title: 'Nearly 200 Multi-Sampled Instruments',
        description: 'Explore a vast collection of nearly 200 multi-sampled instruments including guitars, synths, wind instruments, percussion, textures, toys, and more. This diverse library ensures you will have no trouble finding the perfect sounds to layer and combine, allowing you to create truly original compositions that stand out from the crowd.',
        image_url: ''
      },
      {
        title: 'Built-In Effects Suite',
        description: 'Enhance your layered sounds with Reiya\'s comprehensive built-in FX panel. Two main multi-FX knobs control nearly 20 parameters across 7 different effects. The Dimension knob controls Saturator, Compressor, Stereo Expander, and Limiter, while the Space & Time knob controls Delay, Reverb, and Chorus. Fine-tune these effects with various LFOs, filters, and FX-specific parameters to add unique twists and dimension to your sound.',
        image_url: ''
      },
      {
        title: 'Intuitive Interface',
        description: 'Navigate Reiya with ease thanks to its smooth and user-friendly interface. All controls are consolidated into a single window, making it easy to access every parameter and feature. Whether you are creating your own sounds or browsing through the 200+ included factory presets, the intuitive layout ensures a seamless and efficient workflow.',
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
      'Download Size': 'Installer: ~3GB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
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

  console.log('✅ Successfully updated Reiya product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateReiyaProduct().catch(console.error);



