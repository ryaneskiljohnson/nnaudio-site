import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateApacheProduct() {
  console.log('=== Updating Apache Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Apache product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.apache-flute,slug.eq.apache,name.ilike.%apache%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Native American Flutes',
    short_description: 'Capture the essence of the Native American world & immerse yourself in the untamed beauty of the natural realm. Breathe life into Modern Music with Traditional Flute recordings. Enable a harmonious fusion of ancient wisdom and modern expression. Embark on a sonic journey that transcends time, where haunting melodies and soul-stirring harmonies echo through the wilderness, transporting your music to the sacred grounds of Native American heritage.',
    description: `Capture the essence of the Native American world & immerse yourself in the untamed beauty of the natural realm. Breathe life into Modern Music with Traditional Flute recordings. Enable a harmonious fusion of ancient wisdom and modern expression. Embark on a sonic journey that transcends time, where haunting melodies and soul-stirring harmonies echo through the wilderness, transporting your music to the sacred grounds of Native American heritage.

Sculpt Ethereal Soundscapes That Echo With Nature

Immerse yourself in the authentic sounds of traditional Native American flutes, meticulously sampled and presented in four individual playable instruments. Craft your compositions with the soul-stirring resonance of each flute, whether individually edited for nuanced expression or collectively shaped for harmonious melodies that echo the spirit of the land.

The user-friendly interface of this plugin streamlines your creative process, offering a single-screen view for swift and intuitive edits. Easily adjust each flute independently or make global changes to transform the collective sound. Dive into a world of sonic possibilities with built-in effect suites that add depth and richness to your compositions.`,
    features: [
      {
        title: '4 Adjustable Flutes',
        description: 'Featuring four distinct flute modules, each a canvas for your creative expression. Dive into the intricacies of sound shaping with editable Hi pass and Lo pass filters, allowing you to sculpt the tonal character of each flute module. Fine-tune the dynamics of your melodies with adjustable attack, release, gain, and pan settings for a level of precision that transcends traditional boundaries. Whether you\'re crafting serene solos or harmonious ensembles, the Apache Flute Plugin provides a versatile and immersive experience, empowering you to tailor the nuances of each module and craft captivating Native American flute compositions with ease.',
        image_url: ''
      },
      {
        title: 'Effects & Artifact Modules',
        description: 'Elevate your flutes to new heights with built-in FX modules, where reverb, delay, LFOs, dimension, and filters converge to infuse your sounds with unparalleled depth and character. These intuitive modules serve as easy-to-use effect solutions. Immerse your melodies in the lush ambiance of reverb, create captivating rhythmic patterns with the dynamic possibilities of delay, and modulate your flute sounds with the rhythmic precision of LFOs. The dimension and filters further enhance your sonic palette, providing a seamless and efficient way to shape and customize your flute tones.',
        image_url: ''
      },
      {
        title: 'Easy Interface & Browser',
        description: 'Immerse yourself in a seamless and user-friendly creative experience with an intuitively designed interface. Crafted with efficiency in mind, the single-window layout ensures that all elements are within easy reach, providing users with a comprehensive view of their plugin configurations. This thoughtful design allows for quick and intuitive adjustments, empowering users to effortlessly fine-tune their flute sounds with precision. The included preset browser takes user convenience to the next level, offering easy searchability and options to create and save personalized banjo configurations.',
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
      'Download Size': 'Installer: 93MB',
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

  console.log('✅ Successfully updated Apache product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateApacheProduct().catch(console.error);



