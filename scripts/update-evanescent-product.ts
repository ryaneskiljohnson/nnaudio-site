import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateEvanescentProduct() {
  console.log('=== Updating Evanescent Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Evanescent product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'evanescent-baby-grand-piano')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Baby Grand Piano',
    short_description: 'Capture the enchanting sound of a Baby Grand Piano through the lens of four distinct microphone inputs and positions. Immerse yourself in the expressive depth and organic character of live recorded piano performances, meticulously sampled to deliver unrivaled authenticity. Infuse your compositions with the timeless elegance of a classic piano sound. Craft soulful melodies, dreamy atmospheres, and nostalgic textures that evoke a sense of nostalgia and intimacy.',
    description: `Capture the enchanting sound of a Baby Grand Piano through the lens of four distinct microphone inputs and positions. Immerse yourself in the expressive depth and organic character of live recorded piano performances, meticulously sampled to deliver unrivaled authenticity. Infuse your compositions with the timeless elegance of a classic piano sound. Craft soulful melodies, dreamy atmospheres, and nostalgic textures that evoke a sense of nostalgia and intimacy.

Capture The Timeless Essence Of The Baby Grand Piano

Embark on a journey of sonic elegance with Evanescent, a meticulously sampled Baby Grand Piano plugin that transcends traditional boundaries. Immerse yourself in the nuanced tones of this baby grand, meticulously captured across three distinct velocity layers to capture the full spectrum of expressiveness. Evanescent offers an unparalleled level of control with four different microphone positions, each with its editable parameters, allowing you to shape your piano sound with precision.

Dive into the authenticity of 780 piano samples, including the subtle mechanical noises that add a touch of realism to your compositions. Beyond its pristine samples, Evanescent hosts built-in FX modules and artifact parameters, providing advanced sound shaping and control. Elevate your piano compositions with the timeless elegance and unparalleled realism of Evanescent, where every keystroke is a harmonious blend of tradition and innovation. Immerse yourself in the evocative resonance of a finely sampled baby grand piano, with Evanescent as your gateway to a world of expressive piano compositions.`,
    features: [
      {
        title: '4 Editable Mic Positions',
        description: 'Immerse yourself in the sonic richness of Evanescent with its versatile mic positioning, featuring four distinct options, including 2 Room Mics, 1 Inside, and 1 Outside the piano. Each mic position can be individually blended using their parameters, providing a myriad of sonic possibilities. From the intimate warmth of the inside perspective to the expansive ambiance captured by the room mics, Evanescent\'s mic positions offer nuanced control, allowing you to sculpt your piano sound with precision and creativity.',
        image_url: ''
      },
      {
        title: '780 HD Piano Samples',
        description: 'Evanescent boasts an extensive library of 780 piano samples, meticulously crafted to encapsulate the expressive dynamics of a baby grand piano. This comprehensive collection includes three velocity layers for each note, ensuring a nuanced response to your playing. Dive into the authenticity of Evanescent with the inclusion of mechanical noises, adding a touch of realism that captures the subtle nuances and character of a finely tuned piano, enriching your compositions with a lifelike resonance.',
        image_url: ''
      },
      {
        title: 'Built-In FX Modules',
        description: 'Elevate your piano compositions with Evanescent\'s robust FX suite and artifact parameters. Unleash your creativity with built-in modules, including reverb, delay, LFOs, artifacts, dimension, and filters. These tools offer a diverse array of sonic possibilities, allowing you to add depth, movement, and character to your piano sound. Evanescent\'s artifact parameters provide advanced control over the subtle nuances, ensuring that every keystroke is a canvas for expressive and nuanced musical expression.',
        image_url: ''
      },
      {
        title: 'Intuitive GUI Layout',
        description: 'Navigate your sonic landscape effortlessly with Evanescent\'s user-friendly interface, thoughtfully designed to consolidate all controls on a single screen. The intuitive layout ensures that every parameter is easily accessible, streamlining your creative process and making sound shaping a seamless and enjoyable experience. Whether you are a seasoned pianist or a novice composer, Evanescent\'s interface invites you to explore and shape your piano compositions with clarity and ease.',
        image_url: ''
      }
    ],
    requirements: {
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      format: 'VST3 | AU',
      windows: 'Windows 10+',
      disk_space: '2GB Disk Space'
    },
    specifications: {
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: 528MB | Samples: 601MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
      'System Requirements': '4GB RAM | 2GB Disk Space'
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

  console.log('✅ Successfully updated Evanescent product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateEvanescentProduct().catch(console.error);



