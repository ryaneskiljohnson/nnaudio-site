import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateMesosphereProduct() {
  console.log('=== Updating Mesosphere Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Mesosphere product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.mesosphere,name.ilike.%mesosphere%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Dual Pad Engine',
    short_description: 'Drag-&-Drop your own samples to express your deepest feelings without speaking a word. Simply Drag & Drop your sample into 1 of 2 Engines, tune your sample & start letting the magic happen. By blending different sounds from both engines, you get insane atmospheres and movement for the background of your tracks. This is how you set the mood and feeling of your production.',
    description: `Drag-&-Drop your own samples to express your deepest feelings without speaking a word. Simply Drag & Drop your sample into 1 of 2 Engines, tune your sample & start letting the magic happen. By blending different sounds from both engines, you get insane atmospheres and movement for the background of your tracks. This is how you set the mood and feeling of your production.

Generate Emotional Pulses & Dimensional Waves

Embark on a celestial sonic journey with Mesosphere, an atmospheric plugin that transcends conventional boundaries. Featuring two powerful sampler engines, Mesosphere invites users to shape their sonic landscapes by seamlessly integrating their own audio through intuitive drag-and-drop functionality or by exploring the included sample archive. Each sampler engine is a canvas waiting to be painted, offering individual editing capabilities that allow users to sculpt the nuances of their chosen sounds. By blending these two samplers together, Mesosphere empowers creators to forge a distinctive atmosphere or ethereal pad.

In addition to its versatile sampling engines, Mesosphere enriches the sonic palette with two oscillators and a full FX suite. These elements provide a dynamic toolkit for shaping and refining the atmospheric textures. Whether you're seeking to add ethereal depth with oscillators or infuse your sounds with spatial nuances using the FX suite, Mesosphere ensures a comprehensive range of sonic manipulation. This plugin serves as a catalyst for inspiration, inviting users to explore the outer realms of atmospheric sound design.`,
    features: [
      {
        title: 'Dual Sampler Engines',
        description: 'Mesosphere boasts dual samplers that redefine the possibilities of atmospheric sound design. These samplers are not only drag-and-drop compatible but also grant users extensive control over their individual parameters. From fine-tuning sample range, loop range, and loop crossfade to adjusting direction, gain, pan, transpose, and detune, each aspect of the samplers can be meticulously shaped. The unique feature lies in the ability to blend these two samplers seamlessly, enabling creators to craft a distinctive sound that harmoniously combines the characteristics of each.',
        image_url: ''
      },
      {
        title: 'Built-In FX Suite',
        description: 'Elevate your atmospheric creations with Mesosphere\'s comprehensive FX Suite, a robust toolkit that includes reverb, delay, dimension, autopan, LFOs, EQ, and filters. Each element within the suite is thoughtfully designed to add depth, spatial nuances, and dynamic movement to your sounds. Whether you\'re seeking the ethereal echoes of reverb, rhythmic textures with LFOs, or precision shaping with EQ and filters, Mesosphere\'s FX Suite offers an extensive range of sonic possibilities. The inclusion of a global AHDSR envelope ensures further control over the overall dynamics.',
        image_url: ''
      },
      {
        title: 'Intuitive GUI Design',
        description: 'Mesosphere\'s user-friendly interface is designed for seamless and intuitive navigation, consolidating all aspects of the plugin onto a single screen. This thoughtful layout ensures that every parameter, from sampling and editing to oscillators and FX, is easily accessible. Whether you\'re a seasoned producer or a newcomer to atmospheric sound design, Mesosphere\'s interface encourages exploration and creativity, fostering an environment where every aspect of your sonic vision is within reach.',
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
      'Download Size': 'Installer: 53MB | Samples: 139MB',
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

  console.log('✅ Successfully updated Mesosphere product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateMesosphereProduct().catch(console.error);



