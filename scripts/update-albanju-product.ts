import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateAlbanjuProduct() {
  console.log('=== Updating Albanju Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Albanju product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'albanju')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Middle Eastern Banjos',
    short_description: 'Meticulously sampled sounds from four distinct Middle Eastern Banjos offers a rich palette of tones and timbres that evoke the enchanting spirit of the region. Infuse your creations with the evocative charm of the Middle Eastern setting. Explore the depth and intricacy of Middle Eastern music and let its authentic sounds transport your compositions to the heart of this ancient and captivating culture.',
    description: `Meticulously sampled sounds from four distinct Middle Eastern Banjos offers a rich palette of tones and timbres that evoke the enchanting spirit of the region. Infuse your creations with the evocative charm of the Middle Eastern setting. Explore the depth and intricacy of Middle Eastern music and let its authentic sounds transport your compositions to the heart of this ancient and captivating culture.

Take Tradition & Make It A Modern Solution

Embark on a melodic journey through the rich tapestry of Middle Eastern sounds. This unique product features four meticulously sampled banjo engines, each capturing the authentic essence of Middle Eastern musical traditions. Indulge in the soulful resonance of individually adjustable banjos, each intricately multi-sampled for unparalleled realism. Effortlessly blend these 4 banjos together, creating harmonies that echo the spirit of ancient traditions.

The intuitive interface invites you to explore the intricacies of Middle Eastern music with ease. The product's built-in FX modules and artifact adjustments allow you to shape and refine the banjo sounds, adding a layer of modern versatility to this traditional instrument. Navigate through a treasure of presets in the user-friendly browser, unlocking endless inspiration for your compositions. This is a gateway to the heart of Middle Eastern music, empowering you to infuse your productions with the soul-stirring allure of ethnic melodies.`,
    features: [
      {
        title: '4 Adjustable Banjos',
        description: '4 individually adjustable banjos, each offering a distinct sonic character that pays homage to Middle Eastern musical heritage. Users have unprecedented control, with the ability to finely tune the attack, release, gain, and pan settings of each banjo, shaping the nuances of their sound with precision. The flexibility extends further, allowing users to activate or deactivate any of these banjos at will, providing a dynamic range of possibilities within their compositions. Elevate your creativity by seamlessly blending up to all 4 banjos together, forging a harmonious symphony of Middle Eastern banjo tones.',
        image_url: ''
      },
      {
        title: 'Effects & Artifact Modules',
        description: 'Elevate your banjo to new heights with built-in FX modules, where reverb, delay, LFOs, dimension, and filters converge to infuse your sounds with unparalleled depth and character. These intuitive modules serve as easy-to-use effect solutions. Immerse your melodies in the lush ambiance of reverb, create captivating rhythmic patterns with the dynamic possibilities of delay, and modulate your banjo sounds with the rhythmic precision of LFOs. The dimension and filters further enhance your sonic palette, providing a seamless and efficient way to shape and customize your banjo tones.',
        image_url: ''
      },
      {
        title: 'Easy Interface & Browser',
        description: 'Immerse yourself in a seamless and user-friendly creative experience with an intuitively designed interface. Crafted with efficiency in mind, the single-window layout ensures that all elements are within easy reach, providing users with a comprehensive view of their banjo configurations. This thoughtful design allows for quick and intuitive adjustments, empowering users to effortlessly fine-tune their banjo sounds with precision. The included preset browser takes user convenience to the next level, offering easy searchability and options to create and save personalized banjo configurations.',
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
      'Download Size': 'Installer: 93MB',
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

  console.log('✅ Successfully updated Albanju product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateAlbanjuProduct().catch(console.error);



