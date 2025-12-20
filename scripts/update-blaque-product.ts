import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateBlaqueProduct() {
  console.log('=== Updating Blaque Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Blaque product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'blaque')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Multi-Guitar Plugin Bundle',
    short_description: 'Immerse yourself in a dark and twisted sonic realm where live recorded electric guitars and amps reign supreme. Meticulously captured and expressive guitar samples transport you to the edge of a sonic abyss, where haunting melodies and menacing riffs come to life. A wide array of tones, from atmospheric cleans to blistering distortion, empower you to carve your own path in this sonic underworld.',
    description: `Immerse yourself in a dark and twisted sonic realm where live recorded electric guitars and amps reign supreme. Meticulously captured and expressive guitar samples transport you to the edge of a sonic abyss, where haunting melodies and menacing riffs come to life. A wide array of tones, from atmospheric cleans to blistering distortion, empower you to carve your own path in this sonic underworld.

Generate Electric Guitars That Resonates With Intensity

Step into the realm of electrifying guitar tones with our Blaque Electric Guitar plugin, a dynamic virtual instrument that brings the power of four customizable guitar modules to your fingertips. Immerse yourself in a symphony of possibilities as you individually sculpt the sonic characteristics of each guitar or transform them collectively for a harmonious blend. Choose from a rich array of 30 meticulously multi-sampled guitars, each capturing the essence of various tonal palettes to elevate your compositions.

Welcome to a world of sonic exploration with built-in FX modules that add depth and character to your music. The easy-to-use interface ensures that every element is effortlessly accessible on a single screen, making both global and individual edits a breeze.`,
    features: [
      {
        title: '4 Guitar Modules',
        description: 'Featuring four distinct guitar modules, each a canvas for your creative expression. Dive into the intricacies of sound shaping with editable Hi pass and Lo pass filters, allowing you to sculpt the tonal character of each guitar module. Fine-tune the dynamics of your melodies with adjustable attack, release, gain, and pan settings for a level of precision that transcends traditional boundaries. Whether you are crafting serene solos or harmonious ensembles, the Blaque Electric Guitar Plugin provides a versatile and immersive experience, empowering you to tailor the nuances of each module and craft captivating electric guitar compositions with ease.',
        image_url: ''
      },
      {
        title: 'Effects & Artifact Modules',
        description: 'Elevate your electric guitars to new heights with built-in FX modules, where reverb, delay, LFOs, dimension, and filters converge to infuse your sounds with unparalleled depth and character. These intuitive modules serve as easy-to-use effect solutions. Immerse your melodies in the lush ambiance of reverb, create captivating rhythmic patterns with the dynamic possibilities of delay, and modulate your guitar sounds with the rhythmic precision of LFOs. The dimension and filters further enhance your sonic palette, providing a seamless and efficient way to shape and customize your guitar tones.',
        image_url: ''
      },
      {
        title: 'Easy Interface & Browser',
        description: 'Immerse yourself in a seamless and user-friendly creative experience with an intuitively designed interface. Crafted with efficiency in mind, the single-window layout ensures that all elements are within easy reach, providing users with a comprehensive view of their plugin configurations. This thoughtful design allows for quick and intuitive adjustments, empowering users to effortlessly fine-tune their guitar sounds with precision. The included preset browser takes user convenience to the next level, offering easy searchability and options to create and save personalized guitar configurations.',
        image_url: ''
      }
    ],
    requirements: {
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      format: 'VST3 | AU',
      windows: 'Windows 10+',
      disk_space: '1GB Disk Space'
    },
    specifications: {
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: 688MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
      'System Requirements': '4GB RAM | 1GB Disk Space'
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

  console.log('✅ Successfully updated Blaque product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateBlaqueProduct().catch(console.error);



