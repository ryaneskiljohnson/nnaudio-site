import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateCurioProduct() {
  console.log('=== Updating Curio Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Curio product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.curio-texture-generator,slug.eq.curio,name.ilike.%curio%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Dynamic Texture Generator',
    short_description: 'Curio stands as the quintessence of sonic innovation, an audio plugin meticulously crafted to redefine the very essence of sound manipulation. Its purpose is to seamlessly transmute ordinary samples into ethereal textures and hypnotic drones.',
    description: `Curio stands as the quintessence of sonic innovation, an audio plugin meticulously crafted to redefine the very essence of sound manipulation. Its purpose is to seamlessly transmute ordinary samples into ethereal textures and hypnotic drones. With four dynamic sampler engines at their disposal, artists and producers can effortlessly sculpt and morph soundscapes, ushering in a new era of musical exploration where boundaries dissolve, and creativity knows no limits.

Sculpt Your Sonic Reality

Step into the future of sound manipulation with Curio, a groundbreaking audio plugin designed to push the boundaries of sonic creativity. With its innovative approach, Curio transforms any sample into a rich tapestry of textures and drones, offering users unparalleled control over their musical compositions. Featuring four customizable sampler engines, Curio empowers musicians and producers to explore new sonic realms, manipulating pitch, timbre, and modulation with ease.

Embrace the digital evolution of music production with Curio's intuitive interface, allowing users to effortlessly import their own WAV samples and craft unique sonic landscapes. Seamlessly blend between sampler engines using Curio's Morph effect, creating fluid transitions and dynamic compositions that defy traditional sound design. Dive into a realm of limitless possibilities as Curio revolutionizes the way you interact with sound, offering a glimpse into the future of auditory exploration.`,
    features: [
      {
        title: '4 Customizable Samplers',
        description: 'Dive into a world of sonic craftsmanship as these samplers become a canvas for artistic expression, offering a wealth of editing options. With intuitive drag-and-drop functionality, users have the power to seamlessly integrate their own samples & blend the sounds of their lives into their musical creations. From capturing the ambient city streets to recording nature\'s symphony, Curio enables artists to harness the raw essence of their surroundings, even audio captured on your cell phone.',
        image_url: ''
      },
      {
        title: 'Create Any Key or Chord',
        description: 'Experience unprecedented control over your sound with Curio\'s resonant EQ sliders. With the ability to boost the gain of any key, users can sculpt their sound with remarkable precision, imbuing it with a playable tone that resonates with depth and character. By boosting multiple keys, artists can craft rich, chord-like textures or expansive drones that envelop the listener in a symphony of harmonics. Users can fine-tune the resonance of their sound to perfection, ensuring every note sings with clarity and presence.',
        image_url: ''
      },
      {
        title: 'Dynamic Resonance',
        description: 'Gain unprecedented control over their audio textures and drone instruments. Dynamic Resonance Control empowers creators to effortlessly manipulate up to 8 resonance gains per sampler, both dynamically and manually. This means users can finely tune and modulate the resonant characteristics of their samples in real-time, unlocking boundless creative possibilities. Curio\'s Dynamic Resonance Control offers unparalleled flexibility and precision, elevating the art of your sound design.',
        image_url: ''
      },
      {
        title: 'Simple, Powerful Effects',
        description: 'The heart is the Morph Blender, a tool that seamlessly intertwines engaged samplers, creating a tapestry of sound that\'s uniquely yours. A compressor meticulously crafted to pull your sound together with finesse, ensuring every element sits harmoniously within the mix. Delay and Reverb effects transport your listeners to immersive sonic landscapes. With a final touch-up from the Draggable EQ, your sound emerges polished and refined, all within the Curio interface.',
        image_url: ''
      },
      {
        title: 'Stock Presets & Starters',
        description: 'Unlock 40 stock presets and sound starters, meticulously crafted to inspire and ignite your creativity. Whether you\'re seeking instant inspiration or a starting point for your sonic explorations, these presets serve as a gateway to boundless musical expression. With the ability to save presets with your own samples, Curio empowers you to curate a personalized sonic palette that reflects your artistic vision. From ethereal textures to pulsating drones, the possibilities are endless.',
        image_url: ''
      },
      {
        title: 'Intuitive Interface Design',
        description: 'Immerse yourself in a world of seamless creativity. This GUI was meticulously crafted to streamline your workflow and unleash your artistic vision. Everything you need is elegantly presented on a single screen, eliminating the need to navigate through multiple windows and menus. Every aspect of your sound design process is within arm\'s reach. The intuitive layout ensures that you can focus on crafting your sonic masterpiece without distractions. The GUI also scales down to nearly 50% in size.',
        image_url: ''
      }
    ],
    requirements: {
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      format: 'VST3 | AU',
      windows: 'Windows 10+',
      disk_space: '250MB Disk Space'
    },
    specifications: {
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: 35MB | Samples: 114MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
      'System Requirements': '4GB RAM | 250MB Disk Space'
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

  console.log('✅ Successfully updated Curio product data!');
  console.log('\n⚠️  Note: Feature images/GIFs need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateCurioProduct().catch(console.error);



