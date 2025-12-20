import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateObscuraProduct() {
  console.log('=== Updating Obscura Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Obscura product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.obscura-tortured-orchestral-box,slug.eq.obscura,name.ilike.%obscura%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Tortured Orchestral Box',
    short_description: 'Obscura, a unique instrument, is not just a tool for music creation; it\'s a portal to a world where mysterious wooden boxes held secrets and enchantment. Within its heart, you\'ll discover an orchestra of eerie and ominous voices. Each instrument evokes the essence of a time when legends were born and legends were lost.',
    description: `Obscura, a unique instrument, is not just a tool for music creation; it's a portal to a world where mysterious wooden boxes held secrets and enchantment. Within its heart, you'll discover an orchestra of eerie and ominous voices. Each instrument evokes the essence of a time when legends were born and legends were lost. . Release the essence of a long-forgotten time, where music was a tapestry of stories and emotions. This instrument is an enchanting journey into the past, a sonic tapestry that will transport you to a time when magic was real, and music was its language.

Your Muse Guiding You Through Medieval Journeys

Embark on a journey through the shadows of sound with Obscura, an orchestral plugin that unfolds a mystical realm. This dark orchestral engine features 32 meticulously multi-sampled orchestral instruments, each contributing to the rich tapestry of an otherworldly sonic landscape. The hauntingly beautiful tones create an immersive experience that captures the essence of mysterious and atmospheric orchestral compositions.

Obscura transcends traditional orchestral boundaries by offering users the ability to play up to 16 voices simultaneously. This innovative feature empowers composers to craft intricate arrangements, layering various orchestral elements to evoke emotions ranging from suspense to melancholy. Complemented by a built-in FX suite, Obscura provides additional control and sound design possibilities. This suite includes essential effects for shaping and enhancing the orchestral soundscape, allowing users to sculpt their compositions with precision and creativity.`,
    features: [
      {
        title: '32 Sampled Instruments',
        description: 'Obscura opens a portal to a vast orchestral palette with its collection of 32 meticulously multi-sampled instruments boasting over 1,150 total samples. Encompassing Strings, Brass, Woodwinds, and Vocals, this orchestral arsenal captures the essence of each section, providing a rich and diverse sonic tapestry for composers and creators. Whether summoning the emotive resonance of strings, the majestic tones of brass, the expressive nuances of woodwinds, or the ethereal qualities of vocals, Obscura delivers a versatile range of orchestral timbres for immersive musical storytelling.',
        image_url: ''
      },
      {
        title: '16 Playable Voices',
        description: 'Offering unparalleled creative freedom, Obscura empowers composers with the ability to play up to 16 voices simultaneously. This innovative feature allows users to layer and weave intricate orchestrations, exploring unique combinations of instruments to craft evocative compositions. Each of the 16 voices is editable individually, providing detailed control over parameters, and can be further tailored within their subgroup of Strings, Brass, Woodwind, or Vocals. This flexibility ensures a dynamic and expressive orchestral experience, enabling users to shape their sonic narratives with precision.',
        image_url: ''
      },
      {
        title: 'Built-In Effects Modules',
        description: 'Obscura\'s sonic sculpting capabilities extend further with its built-in FX suite, providing a comprehensive set of effects for added control and sound design. The suite includes essential tools such as reverb, delay, compression, EQ, dimension, wobble, and flutter, allowing composers to shape the orchestral soundscape with depth, texture, and atmospheric nuances. Whether seeking ethereal reverbs, rhythmic delays, or dynamic compression, Obscura\'s FX suite enriches the orchestral journey with endless possibilities.',
        image_url: ''
      },
      {
        title: 'Intuitive Interface Layout',
        description: 'Designed for ease of use, Obscura features an intuitive interface with a layout that streamlines the creative process. With all controls easily accessible, users can navigate and shape their orchestral compositions effortlessly. This user-friendly design ensures a seamless workflow, allowing composers to focus on their artistic vision and bring their dark orchestral narratives to life with simplicity and precision.',
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
      'Download Size': 'Installer: 100MB | Samples: 2.1GB',
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

  console.log('✅ Successfully updated Obscura product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateObscuraProduct().catch(console.error);



