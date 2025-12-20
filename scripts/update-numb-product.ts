import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateNumbProduct() {
  console.log('=== Updating Numb Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Numb product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'numb')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Dark Acoustic Guitars',
    short_description: 'Journey through the depths of a dark underworld, where the soulful resonance of live recorded acoustic guitars becomes your guide. Seamlessly blend the warmth and authenticity of acoustic performances. With meticulously captured samples, you will experience a diverse range of tones, from delicate fingerpicking to haunting experimental, all evoking an eerie and melancholic atmosphere. Explore the depths of acoustic soundscapes and bring your compositions to light with evocative and ethereal character.',
    description: `Journey through the depths of a dark underworld, where the soulful resonance of live recorded acoustic guitars becomes your guide. Seamlessly blend the warmth and authenticity of acoustic performances. With meticulously captured samples, you'll experience a diverse range of tones, from delicate fingerpicking to haunting experimental, all evoking an eerie and melancholic atmosphere. Explore the depths of acoustic soundscapes and bring your compositions to light with evocative and ethereal character.

Conjure A Sense Of Haunting Beauty & Evoke Emotions

Embark on a journey into the haunting depths of sound with Numb, an extraordinary dark acoustic guitar plugin that unveils a diverse sonic palette. Featuring 14 meticulously multi-sampled guitars, Numb transcends traditional acoustic tones, offering an array of dark and mysterious textures. The magic lies within its four guitar engines, allowing users to seamlessly blend and individually edit the chosen guitar sounds. This innovative approach enables musicians to craft nuanced compositions as they explore the intricate sonic landscape of Numb's dark acoustic realm.

Numb's sonic prowess extends beyond its multi-sampled guitars with a comprehensive suite of built-in FX modules. These effects, coupled with artifact parameters, inject advanced soundscapes and creativity into the dark acoustic realm. The easy-to-use interface, consolidated onto a single screen along with the preset browser, ensures seamless navigation, allowing users to effortlessly explore the enigmatic depths of Numb and bring their dark acoustic visions to life.`,
    features: [
      {
        title: '14 Multi-Sampled Guitars',
        description: 'Numb boasts a rich collection of 14 multi-sampled acoustic guitars, capturing the essence of classic western, Spanish guitars, and various guitar variations from around the world. It also includes a sampled version of guitar fret noises for a more realistic play and sound. This diverse array of guitar tones ensures that users can explore a broad spectrum of acoustic textures, from traditional to exotic, infusing their compositions with a unique and global sonic character.',
        image_url: ''
      },
      {
        title: '4 Guitar Engines',
        description: 'Dive into sonic exploration with Numb\'s innovative 4 blended guitar engines, offering a dynamic approach to acoustic sound design. Users have the flexibility to individually edit each chosen guitar sound, adjusting parameters such as attack, release, highpass, lowpass, gain, and pan. The ability to blend up to four guitars in a single instance opens the door to crafting a distinctive dark acoustic sound, enabling users to experiment with layering and texture for unparalleled sonic richness.',
        image_url: ''
      },
      {
        title: 'Built-In Effects Suite',
        description: 'Elevate your dark acoustic compositions with Numb\'s built-in FX suite and artifact parameters, delivering a comprehensive toolkit for sonic enhancement. The FX suite encompasses essential effects such as reverb, delay, stereo width, LFO, artifacts, EQ, and filters. These features provide users with creative control over every sonic nuance, allowing for the sculpting of atmospheric reverbs, haunting delays, and experimental textures to bring depth and character to their dark acoustic creations.',
        image_url: ''
      },
      {
        title: 'Intuitive Interface Layout',
        description: 'Numb\'s user-friendly design is characterized by an easy-to-use and intuitive plugin layout that consolidates all controls into a single window. This streamlined interface ensures that everything, from sound editing to effects manipulation, is easily accessible at a glance. The inclusion of a preset browser within the same window further enhances the seamless and efficient navigation of Numb, empowering users to effortlessly shape their dark acoustic sonic landscapes with precision and creativity.',
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
      'Download Size': 'Installer: 311MB',
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

  console.log('✅ Successfully updated Numb product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateNumbProduct().catch(console.error);



