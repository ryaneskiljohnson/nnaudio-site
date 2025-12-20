import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateDigitalEchoesProduct() {
  console.log('=== Updating Digital Echoes Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Digital Echoes product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.digital-echoes-delay,slug.eq.digital-echoes,name.ilike.%digital echoes%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Dimensional Delay | Version 1.3.1',
    short_description: 'Step into a mesmerizing sonic realm where ethereal echoes cascade through the air like shimmering stardust, immersing your tracks in a cinematic tapestry of otherworldly beauty. Harness the power of tri-band architecture to effortlessly manipulate frequencies, infuse pulsating rhythms, and orchestrate an expansive sonic panorama.',
    description: `Step into a mesmerizing sonic realm where ethereal echoes cascade through the air like shimmering stardust, immersing your tracks in a cinematic tapestry of otherworldly beauty. Harness the power of tri-band architecture to effortlessly manipulate frequencies, infuse pulsating rhythms, and orchestrate an expansive sonic panorama. Prepare to embark on a sonic odyssey where past, present, and future converge, leaving an indelible imprint of atmospheric brilliance on your musical creations.

The Conduit Through Which Ethereal Melodies Resonate

This dimensional delay effect seamlessly combines three distinct delays into a singular, immersive experience. Each of the three delays is an independent entity, allowing you to sculpt time and space with individualized parameters. Dive into the rhythmic intricacies as each delay is tempo-synced, ensuring your echoes resonate in harmony with your compositions. Tailor the feedback, mix, time, highpass and lowpass of each delay, unlocking a realm of creative possibilities for shaping the temporal landscape of your sound.

Digital Echoes goes beyond the conventional with additional modules that enhance your sonic exploration. Immerse your audio in the lush ambiance of the reverb, fine-tune frequencies with the EQ module, and delve into the dimensional effects that add a captivating spatial dimension to your sound.`,
    features: [
      {
        title: '3 Powerful Delays',
        description: 'Immerse yourself in the boundless possibilities of Digital Echoes as it seamlessly merges three independent delays into one powerful plugin. Each delay operates as a distinct entity with individual parameters, providing unparalleled control over your temporal landscape. With tempo-synced precision, edit feedback, mix, time, highpass and lowpass for each delay, crafting echoes that resonate in perfect harmony with your compositions. This dynamic fusion of delays empowers you to sculpt time and space with precision, ensuring your sound is not just heard but experienced.',
        image_url: ''
      },
      {
        title: 'Additional Multi-Effects',
        description: 'Unlock a new dimension of sonic exploration with Digital Echoes\' array of effects, including reverb, stereo dimension, and slap delay, each offering substantial dimensional value. Immerse your sound in lush ambiances, widen your stereo field, and add dynamic spatial effects that elevate your mix to over a 200% dimensional emulation. Whether you seek ethereal atmospheres or immersive soundscapes, Digital Echoes\' diverse effects contribute to a richer, multidimensional sonic experience that goes beyond the ordinary.',
        image_url: ''
      },
      {
        title: 'See Your Sound & Space',
        description: 'Elevate your sonic journey with Digital Echoes\' visualizers, providing an intuitive and immersive experience as your sound weaves through the plugin. Easily visualize your incoming audio signal, gaining real-time insight into its nuances and evolution within the Delay modules. Witness the reverb and dimensional effects come to life through dedicated visualizers, allowing you to shape your sound with precision. This visual feedback transforms your creative process, offering a holistic view of your sonic landscape and enhancing your ability to craft immersive compositions with clarity and finesse.',
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
      'Download Size': 'Installer: 45MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
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

  console.log('✅ Successfully updated Digital Echoes product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateDigitalEchoesProduct().catch(console.error);



