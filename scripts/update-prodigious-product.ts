import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateProdigiousProduct() {
  console.log('=== Updating Prodigious Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Prodigious product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.prodigious,name.ilike.%prodigious%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Complete Orchestral Engine',
    short_description: 'Prodigious is a serious and in-depth Orchestral Rompler that gives you the freedom to be creative. 32 Total Sampled Instruments give you goosebumps as you steam through Chilling Strings, Brash Brass, Eerie Woodwinds & Tainted Vocals. Choose from 1 of 75 stock presets or cast as spell and create your very own dark orchestra, You\'re the conductor now.',
    description: `Prodigious is a serious and in-depth Orchestral Rompler that gives you the freedom to be creative. 32 Total Sampled Instruments give you goosebumps as you steam through Chilling Strings, Brash Brass, Eerie Woodwinds & Tainted Vocals. Choose from 1 of 75 stock presets or cast as spell and create your very own dark orchestra, You're the conductor now.

Your Complete Orchestral Engine Awaits

Step into the realm of sonic grandeur with Prodigious, an orchestral instrument that exudes dark and gritty allure. This powerful engine encompasses a symphony of string, brass, wind, and vocal sections, delivering a diverse and evocative orchestral experience. Featuring 32 meticulously multi-sampled instruments, Prodigious captures the raw essence of each section. This orchestral plugin immerses composers and creators in a world of cinematic depth, where each instrument resonates with an evocative and distinct voice.

Prodigious can play a staggering 64 voices when ensemble mode is activated. This innovative feature empowers composers to unleash a symphony of sonic textures, layering multiple voices to create rich and immersive orchestrations. Whether crafting intricate melodies, powerful crescendos, or haunting atmospheres, Prodigious offers unparalleled versatility for composers seeking to shape dark and emotive sonic landscapes. Complementing its expansive capabilities, Prodigious is equipped with a built-in FX suite, providing a toolkit for further sonic design and advanced sound sculpting.`,
    features: [
      {
        title: '32 Sampled Instruments',
        description: 'Prodigious unleashes a vast sonic arsenal with its collection of 32 meticulously multi-sampled instruments, encompassing strings, brass, woodwinds, and vocals. Boasting a staggering 592 total orchestral presets, this orchestral engine channels dark, dull, and ominous tones, providing composers and creators with a versatile palette for crafting evocative and atmospheric soundscapes. Each instrument within Prodigious resonates with unique character, ensuring a rich tapestry of sonic possibilities that transcend traditional orchestral boundaries.',
        image_url: ''
      },
      {
        title: '64 Playable Voices',
        description: 'Elevate your orchestral compositions with Prodigious\'s ability to play a remarkable 64 voices simultaneously, a feat unlocked by activating the "ensemble" mode. This innovative feature allows composers to harness the power of an ensemble, activating 4 voices per instrument. Whether orchestrating grandiose swells or intricate arrangements, the 64 playable voices provide a symphony of sonic textures that enhance the depth and expression of your compositions, pushing the boundaries of dark orchestral exploration.',
        image_url: ''
      },
      {
        title: 'Built-In Effects Suite',
        description: 'Prodigious goes beyond conventional orchestral instruments with its built-in FX modules, offering added control, functionality, and sound design possibilities. The FX suite includes essential tools such as reverb, delay, LFOs, dimension, and EQ, empowering composers to shape their orchestral soundscape with depth and atmospheric nuances. From ethereal reverbs to rhythmic delays, these FX modules enhance the creative potential of Prodigious, allowing for intricate sonic manipulation and customization.',
        image_url: ''
      },
      {
        title: 'Easy-To-Use Interface',
        description: 'Navigating the vast capabilities of Prodigious is a seamless experience thanks to its easy-to-use and intuitive interface. Most functions are consolidated within a single screen, ensuring that composers can access essential controls effortlessly. The inclusion of a preset browser within the same interface further streamlines the creative process, providing composers with efficient access to the diverse orchestral presets and functionalities that Prodigious offers.',
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
      'Download Size': 'Installer: 91MB | Samples: 1.6GB',
      'Delivery Format': 'WIN: EXE | MAC: PKG | Samples: ZIP',
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

  console.log('✅ Successfully updated Prodigious product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateProdigiousProduct().catch(console.error);



