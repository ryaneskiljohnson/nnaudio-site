import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateDigitalDreamscapeProduct() {
  console.log('=== Updating DigitalDreamscape Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get DigitalDreamscape product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.digitaldreamscape-quad-rompler,slug.eq.digitaldreamscape,name.ilike.%digitaldreamscape%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Quad Engine Rompler',
    short_description: 'Immerse yourself in a sonic universe where imagination takes flight and creativity knows no bounds. Blend an array of meticulously crafted sounds, transporting you to a realm where music and dreams intertwine.',
    description: `Immerse yourself in a sonic universe where imagination takes flight and creativity knows no bounds. Blend an array of meticulously crafted sounds, transporting you to a realm where music and dreams intertwine. Explore a vast palette of ethereal, celestial, and atmospheric layers, allowing your compositions to transcend reality and delve into the realm of the subconscious. Unleash your creativity and unlock a world of limitless sonic possibilities.

Navigate Through The Matrix & Explore A World Of Sounds

Embark on a sonic odyssey with DigitalDreamscape, a Quad Engine Rompler instrument that redefines the realm of sound exploration. With four distinct engines, each customizable and individually editable, this plugin opens the gateway to a vast universe of sonic possibilities. Dive into the intricacies of each engine, tailoring your sounds with precision and creativity. Whether you're crafting ethereal pads, expressive leads, or pulsating basslines, DigitalDreamscape's versatility empowers you to sculpt your sonic landscape with unparalleled control.

DigitalDreamscape is a treasure trove of sonic inspiration, boasting an extensive library of 315 multi-sampled instruments and over 500 meticulously crafted factory presets. Unleash a kaleidoscope of sounds, from classical instruments to futuristic synths, offering a rich palette for every musical genre. The plugin goes beyond static samples, featuring built-in oscillators and FX modules that add dynamic movement and character to your creations. Elevate your compositions with the expressive power of DigitalDreamscape, where innovation meets tradition in a fusion of endless sonic exploration and timeless inspiration.`,
    features: [
      {
        title: '4 Rompler Engines',
        description: 'Explore a world of sonic manipulation with DigitalDreamscape\'s four rompler engines, each offering unparalleled control over your soundscapes. Effortlessly change samples, edit individual sound parameters such as gain, pan, transposition, and detune. Dive into the innovative draggable filter panel, allowing precise frequency control for each sound. Blend these four sounds seamlessly to craft something truly unique, giving you the flexibility to sculpt your sonic identity with unparalleled depth and creativity.',
        image_url: ''
      },
      {
        title: 'Built-In FX Modules',
        description: 'Elevate your audio creations with DigitalDreamscape\'s built-in FX modules, a powerhouse of sonic enhancement options. Immerse your sounds in lush reverberations, add rhythmic depth with delays, modulate with precision using LFOs, shape frequencies with filters, and introduce dynamic movement with autopan. These FX modules offer a versatile toolkit, allowing users to infuse their compositions with an array of textures and dimensions, ensuring each creation stands out with sonic richness and character.',
        image_url: ''
      },
      {
        title: '315 Sampled Instruments',
        description: 'Immerse yourself in a sonic palette of unprecedented breadth with DigitalDreamscape\'s vast library of 315 multi-sampled instruments. From expressive synths and resonant guitars to emotive woodwinds and classic keys, this plugin spans a diverse range of sounds. Whether you seek the warmth of traditional instruments or the cutting-edge sounds of modern synths, DigitalDreamscape offers an expansive collection for every musical exploration, providing an extensive array of textures and tones to elevate your compositions.',
        image_url: ''
      },
      {
        title: '500+ Factory Presets',
        description: 'Embark on a creative journey with over 500 meticulously crafted factory presets within DigitalDreamscape. These presets showcase the versatility of the plugin, offering a wealth of inspiration across genres. From cinematic atmospheres to vibrant electronic textures, each preset is a carefully curated sonic exploration, providing users with a starting point for their musical endeavors. Unlock the potential of your compositions with these expertly crafted presets, each a testament to the diverse sonic landscapes achievable with DigitalDreamscape.',
        image_url: ''
      },
      {
        title: 'Intuitive Interface',
        description: 'Navigate your sonic playground with ease through DigitalDreamscape\'s user-friendly interface, featuring an intuitive design that enhances both functionality and aesthetics. Effortlessly access and manipulate the various parameters with a streamlined layout, ensuring a smooth and enjoyable creative process. The easy-to-use design extends beyond aesthetics, providing an accessible space for both seasoned professionals and newcomers to unleash their creativity with confidence and efficiency.',
        image_url: ''
      }
    ],
    requirements: {
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      format: 'VST3 | AU',
      windows: 'Windows 10+',
      disk_space: '4GB Disk Space'
    },
    specifications: {
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: 256MB | Samples: 3.19GB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
      'System Requirements': '4GB RAM | 4GB Disk Space'
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

  console.log('✅ Successfully updated DigitalDreamscape product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateDigitalDreamscapeProduct().catch(console.error);



