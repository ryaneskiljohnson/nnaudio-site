import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateRomplProduct() {
  console.log('=== Updating Rompl Workstation Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Rompl Workstation product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.rompl-workstation,slug.eq.rompl,name.ilike.%rompl%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Quad Engine Sampler',
    short_description: 'Step into a realm where the boundaries of audio manipulation have been blurred, and the past, present, and future converge in a symphony of creativity. This versatile instrument features four dynamic samplers, primed to harness the power of your custom sounds with effortless drag-and-drop capability.',
    description: `Step into a realm where the boundaries of audio manipulation have been blurred, and the past, present, and future converge in a symphony of creativity. This versatile instrument features four dynamic samplers, primed to harness the power of your custom sounds with effortless drag-and-drop capability. Its pièce de résistance is a mesmerizing sound-blending effect, capable of transporting your audio on a journey through the ages. The result? A unique fusion of eras crafting soundscapes that are both ethereal and timeless. I invite you to channel your inner audio explorer, weaving a tapestry of sonic wonders that defy expectations.

Time Is The Canvas, Audio Is The Masterpiece

Rompl Workstation features four distinct samplers seamlessly blended together by the innovative "Morph" effect. Rompl Workstation offers composers unparalleled flexibility in shaping their soundscapes. The Morph effect allows for smooth transitions between the samplers, enabling the creation of evolving and expressive sonic textures. With drag-and-drop capabilities, composers can effortlessly incorporate their own samples and sounds into Rompl Workstation, fostering a truly personalized and unique sonic palette.

Rompl Workstation goes beyond the realm of traditional samplers by offering a comprehensive built-in effects suite. Comprising reverb, delay, dimension, wobble, flutter, and EQ modules, this suite empowers composers with a diverse set of tools to shape and refine their sounds. The easy-to-use and intuitive sampler design further enhances the creative process, making Rompl Workstation an essential tool for composers seeking a seamless and inspiring workflow in sound development.`,
    features: [
      {
        title: '4 Sampler Engines',
        description: 'Unleash your creativity with Rompl Workstation\'s four powerful sample engines, each individually editable to shape your sonic landscapes. The intuitive "Load" window allows composers to effortlessly drag and drop any sample, instantly opening a world of possibilities for sound exploration. The innovative "Morph" effect adds a unique dimension, enabling seamless blending and shaping of sounds, providing a dynamic and expressive sonic experience.',
        image_url: ''
      },
      {
        title: '200 Sampled Instruments',
        description: 'Dive into a vast library of sound possibilities with Rompl Workstation\'s 200 sampled instruments, accessible through a simple drag-and-drop method. This expansive sample archive spans a diverse range of instruments, from lush pads and expressive guitars to vibrant leads and ethereal flutes. Composers can easily navigate and experiment with this rich collection, injecting their compositions with a myriad of textures and tones.',
        image_url: ''
      },
      {
        title: 'Built-In Effects Suite',
        description: 'Elevate your sonic creations with Rompl Workstation\'s built-in FX suite, featuring essential tools such as delay, reverb, wobble, flutter, EQ, and dimension. The addition of an FX visualizer provides real-time feedback, allowing users to see the impact of effects on their soundscapes. This visual aid enhances the creative process, offering both control and insight into the sonic transformations taking place.',
        image_url: ''
      },
      {
        title: 'Intuitive Plugin Layout',
        description: 'Experience an intuitive sampler design and layout tailored for optimal workflow and performance. Rompl Workstation\'s user-friendly interface ensures ease of use, empowering composers to focus on their creative vision without impediments. With a seamless and efficient design, Rompl Workstation becomes an indispensable tool for those seeking a streamlined and inspiring music production experience.',
        image_url: ''
      }
    ],
    requirements: {
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      format: 'VST3 | AU',
      windows: 'Windows 10+',
      disk_space: '500MB Disk Space'
    },
    specifications: {
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: 60MB | Samples: 372MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG | Samples: ZIP',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
      'System Requirements': '4GB RAM | 500MB Disk Space'
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

  console.log('✅ Successfully updated Rompl Workstation product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateRomplProduct().catch(console.error);



