import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateMandoleleProduct() {
  console.log('=== Updating Mandolele Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Mandolele product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.mandolele-mandolin-ukulele,slug.eq.mandolele,name.ilike.%mandolele%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Mandolin & Ukulele',
    short_description: 'Step into a vibrant and enchanting Eastern world & Capture the essence of live recorded Mandolin and Ukulele performances. Transport yourself to the heart of an Ethnic setting, where soulful melodies paint a vivid musical landscape. Blend the rich timbres of these traditional instruments with modern production techniques & infuse your compositions with the captivating charm of the East.',
    description: `Step into a vibrant and enchanting Eastern world & Capture the essence of live recorded Mandolin and Ukulele performances. Transport yourself to the heart of an Ethnic setting, where soulful melodies paint a vivid musical landscape. Blend the rich timbres of these traditional instruments with modern production techniques & infuse your compositions with the captivating charm of the East. Unlock a world of possibilities enabling you to create mesmerizing soundtracks that resonate with the spirit of this exotic realm.

The Rich Tapestry Of An Ethnic World

Embark on a melodic journey with Mandolele, a versatile plugin that brings the soulful charm of both the mandolin and ukulele to your fingertips. Offering a multi-sampled mandolin and ukulele, Mandolele captures the authentic tonal nuances of these instruments, presenting a rich palette for your musical creations. Each instrument is meticulously sampled twice – once with a pick and once with a finger – providing four distinct tones that can be individually edited and blended seamlessly. Whether you're seeking the crisp attack of a picked mandolin, the gentle resonance of a fingerpicked ukulele, or a fusion of both, Mandolele empowers you to craft unique tones and textures.

Dive into a world of sonic possibilities with Mandolele's built-in FX modules, offering advanced sound shaping and control. The intuitive interface consolidates all controls on a single screen, ensuring a seamless and user-friendly experience. Whether you're a seasoned musician or a budding composer, Mandolele invites you to explore the rich timbres of the mandolin and ukulele, offering a dynamic fusion of tradition and innovation in one harmonious plugin.`,
    features: [
      {
        title: '4 Multi-Sampled Lutes',
        description: 'Mandolele presents an expansive array of sonic possibilities through its multi-sampled mandolin and ukulele, each instrument meticulously sampled twice – once with a pick and once with a finger. This dual sampling approach yields four distinct tones that users can individually edit, shaping the attack, release, gain, and pan for each instrument. The real magic unfolds as these tones are seamlessly blended together, allowing for the creation of unique and textured sounds. Mandolele captures the nuanced expressions of these beloved string instruments.',
        image_url: ''
      },
      {
        title: 'Built-In FX Suite',
        description: 'Elevate your compositions with Mandolele\'s built-in FX suite, a versatile toolkit that includes Reverb, Delay, stereo width, LFO, filters, and artifacts. This comprehensive set of effects modules enables users to add depth, spatial nuances, and dynamic movement to their sounds. Whether you\'re crafting an intimate acoustic ambiance with reverb or experimenting with rhythmic textures using LFO and artifacts, Mandolele\'s FX suite provides a rich palette for sonic exploration & tailors your sounds to perfection.',
        image_url: ''
      },
      {
        title: 'Easy-To-Use Interface',
        description: 'Mandolele ensures a seamless and enjoyable creative process with its easy-to-use interface and intuitive layout. All controls are thoughtfully consolidated on a single screen, allowing users to navigate and manipulate parameters effortlessly. Whether you\'re a seasoned musician or a novice producer, Mandolele\'s user-friendly interface invites exploration and experimentation, fostering a creative environment where every detail of your composition is easily within reach.',
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
      'Download Size': 'Installer: 117MB',
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

  console.log('✅ Successfully updated Mandolele product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateMandoleleProduct().catch(console.error);



