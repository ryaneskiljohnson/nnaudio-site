import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateNokerProduct() {
  console.log('=== Updating Noker Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Noker product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'noker')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Boombox Drum & Bass',
    short_description: 'Immerse yourself in the raw energy and urban vibes of a bygone era and integrate the nostalgic charm of boom box beats into modern production. With meticulously sampled drum kits at your fingertips, you can create dynamic rhythms, punchy grooves, and memorable hooks that pay homage to the golden age of urban music. Step into the past, embrace the rhythmic legacy of the boom box era, and step through your gateway to crafting timeless beats for your modern music productions.',
    description: `Immerse yourself in the raw energy and urban vibes of a bygone era and integrate the nostalgic charm of boom box beats into modern production. With meticulously sampled drum kits at your fingertips, you can create dynamic rhythms, punchy grooves, and memorable hooks that pay homage to the golden age of urban music. Step into the past, embrace the rhythmic legacy of the boom box era, and step through your gateway to crafting timeless beats for your modern music productions.

Experience The Infectious Sounds Of The Boom Box Era

Noker features a robust collection of over 160 meticulously crafted drum, percussion, and bass samples, seamlessly organized into 10 distinct drum kits. With the drums and bass strategically split into even areas on the keyboard, users can effortlessly play and layer these elements in a single instance, unlocking a dynamic range of sonic possibilities. Noker introduces versatility with options for both 808 bass and synth bass, allowing creators to tailor their low-end frequencies to suit various genres and styles. Dive into sonic customization as each drum, percussive element, and bass sound is individually editable.

Noker takes creative exploration to the next level with its global multi-effects, offering a wealth of sonic enhancement with just the turn of two knobs. These effects provide a sonic playground where users can add character and intensity to their drum and bass arrangements. Noker\'s intuitive interface and powerful editing capabilities empower you to craft intricate and dynamic drum and bass compositions that resonate with energy and precision.`,
    features: [
      {
        title: '18 Adjustable Engines',
        description: 'Noker introduces a sonic arsenal of 18 sound engines, spanning kick drums, hi-hats, various percussion instruments, 808 bass, and synth bass. Each of these parameters is fully adjustable, offering users the flexibility to fine-tune every sonic detail. What sets Noker apart is its innovative approach to sample swapping – effortlessly exchange one sample for another within the plugin, providing a seamless and dynamic creative workflow. This feature invites producers to explore a vast array of sonic possibilities, pushing the boundaries of drum and bass composition.',
        image_url: ''
      },
      {
        title: 'Big Effects with 2 Knobs',
        description: 'Elevate your drum and bass productions with Noker\'s transformative global multi-effects, controlled by just two knobs. The "Nok" knob injects punch and depth, enhancing the impact of each hit, while the air knob introduces character and sonic nuances. These two controls act as gateways to a realm of creative intensity, allowing users to shape their sound with ease and precision, resulting in dynamic and expressive drum and bass arrangements. Just turn until you are satisfied with the result.',
        image_url: ''
      },
      {
        title: 'Intuitive Sound Layout',
        description: 'Noker redefines user experience with an intuitive sound layout that enables musicians to play all instruments in a single instance. By evenly spreading each section – Synth Bass, 808 Bass, and Drums & Percussion – across the keyboard, Noker ensures effortless playability and seamless integration of diverse sonic elements. This layout encourages creativity, allowing users to explore diverse rhythms and melodic combinations within a unified interface.',
        image_url: ''
      },
      {
        title: 'Easy-To-Use Interface',
        description: 'Streamlined for user-friendly accessibility, Noker boasts an easy-to-use interface that consolidates all controls onto a single screen. This intuitive design ensures that every parameter, from sound editing to effects manipulation, is readily accessible, empowering users to navigate and shape their drum and bass compositions with efficiency and precision. You can make minor tweaks or major adjustments in a matter of milliseconds.',
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
      'Download Size': 'Installer: 44MB',
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

  console.log('✅ Successfully updated Noker product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateNokerProduct().catch(console.error);



