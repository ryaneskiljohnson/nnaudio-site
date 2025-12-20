import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateNaturaProduct() {
  console.log('=== Updating Natura Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Natura product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'natura')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Moog Grandmother Analog Instruments',
    short_description: 'Step into a sonic realm where the warmth and character of analog recordings transport you to the heart of a natural setting. Capture the essence of vintage synthesizers with unparalleled detail and authenticity. Create organic soundscapes, lush textures, and expressive melodies that are warm with analog characteristics & evoke the beauty of the natural world. Discover a new level of sonic richness and embrace the synergy between analog recordings and modern music production',
    description: `Step into a sonic realm where the warmth and character of analog recordings transport you to the heart of a natural setting. Capture the essence of vintage synthesizers with unparalleled detail and authenticity. Create organic soundscapes, lush textures, and expressive melodies that are warm with analog characteristics & evoke the beauty of the natural world. Discover a new level of sonic richness and embrace the synergy between analog recordings and modern music production.

A New Frontier For The Timeless Allure Of Analog

Step into the realm of vintage warmth and analog nostalgia with Natura, a meticulously crafted plugin that reimagines the sonic legacy of the Moog Grandmother analog synth. Natura encapsulates the essence of analog synthesis by multi-sampling 66 distinct analog instruments from the iconic Moog Grandmother. This extensive library of analog samples empowers users to delve into a rich palette of textures, from the deep bass of oscillators to the resonant leads and evolving pads. The authenticity of Natura lies in its ability to individually edit and blend four analog instruments seamlessly.

In addition to its versatile multi-sampling capabilities, Natura introduces a layer of sonic character through the incorporation of noise elements. Users can infuse their sounds with various tape statics and soundscapes, adding a touch of vintage grit and ambiance to their compositions. To further enhance the sonic journey, Natura includes a built-in FX suite that provides a spectrum of effects. Natura stands as a testament to the enduring charm and sonic allure of analog synthesis in the digital age.`,
    features: [
      {
        title: '4 Analog Engines',
        description: 'Natura introduces a sonic playground with its four individually editable analog engines, allowing users to craft a distinctive analog experience. Each engine is a canvas for sonic exploration, featuring customizable parameters such as sample selection, AHDSR envelope, gain, pan, transpose, and detune. This comprehensive control ensures that every aspect of the analog sound can be fine-tuned to perfection. The real magic happens when these four engines seamlessly blend together, enabling users to create complex, layered textures and unique sonic landscapes that embody the timeless warmth and richness of analog synthesis.',
        image_url: ''
      },
      {
        title: 'Built-In FX Suite',
        description: 'Elevate your sonic creations with Natura\'s built-in FX Suite, a versatile toolkit that amplifies the creative process. This suite includes essential effects such as EQ, Reverb, and delay, providing users with the means to shape and refine their sounds with precision. Additionally, Natura introduces a noise generator featuring various tape noises and soundscapes, adding a vintage touch and a layer of character to compositions. This nuanced noise element enriches the sonic palette, inviting users to explore the nostalgic textures reminiscent of analog recording techniques.',
        image_url: ''
      },
      {
        title: '66 Analog Instruments',
        description: 'Natura pays homage to the iconic Moog Grandmother analog synth by multi-sampling 66 distinct analog instruments, capturing the essence of its rich and diverse sonic palette. These 66 multi-sampled instruments serve as the foundation for over 100 meticulously crafted analog presets, providing users with a wealth of sonic inspiration. From classic leads to evolving pads and deep bass tones, the extensive library of multi-samples ensures that creators can explore the full sonic spectrum of the Moog Grandmother.',
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
      'Download Size': 'Installer: 1.7MB',
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

  console.log('✅ Successfully updated Natura product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateNaturaProduct().catch(console.error);



