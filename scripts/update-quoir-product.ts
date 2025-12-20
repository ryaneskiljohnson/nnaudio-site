import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateQuoirProduct() {
  console.log('=== Updating Quoir Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Quoir product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'quoir')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Mixed Vocals Choir',
    short_description: 'Immerse yourself in the ethereal voices of both men and women, meticulously sampled to create a virtual choir that evokes a sense of mystery and enchantment. Go on a sonic journey through a dark, eerie cathedral, where the harmonies and textures of the human voice intertwine to create haunting melodies and atmospheric soundscapes. Craft hauntingly beautiful compositions, cinematic soundtracks, and experimental arrangements that transport listeners to a realm of otherworldly resonance.',
    description: `Immerse yourself in the ethereal voices of both men and women, meticulously sampled to create a virtual choir that evokes a sense of mystery and enchantment. Go on a sonic journey through a dark, eerie cathedral, where the harmonies and textures of the human voice intertwine to create haunting melodies and atmospheric soundscapes. Craft hauntingly beautiful compositions, cinematic soundtracks, and experimental arrangements that transport listeners to a realm of otherworldly resonance.

Where Shadows Dance & Ethereal Voices Echo

Embark on a haunting choral journey with Quoir. Featuring four distinct vocal engines, each with the ability to select from a pool of 35 vocal samples, Quoir invites composers and creators into a realm of ethereal voices. Users have the power to individually edit each chosen vocal sample, tailoring them to their sonic vision, and then seamlessly blend these voices together. The result is a tapestry of harmonies that captivates with its dark, dull, and eerie resonance.

Quoir not only offers a rich array of vocal possibilities but also enhances the sonic landscape with its built-in effects modules. These modules provide composers with added sound design capabilities and control, allowing for the infusion of atmospheric nuances. Quoir's effects modules ensure a versatile and immersive choral experience. With Quoir, composers can conjure a choir of the shadows, harnessing the power of dark and evocative vocals to elevate their compositions to new heights.`,
    features: [
      {
        title: '4 Vocal Engines',
        description: 'Quoir introduces a dynamic choral experience with its four vocal engines, each offering a distinct layer of vocal depth. Composers can seamlessly blend these engines, creating unique choir sounds that enrich their productions with dimension and emotion. With 25 instantly swappable vocal samples, users have a vast array of sonic possibilities at their fingertips, allowing for the creation of harmonies that evoke a dark and ethereal ambiance.',
        image_url: ''
      },
      {
        title: 'Built-In Effect Modules',
        description: 'Elevate your choral compositions with Quoir\'s built-in effects modules that provide a range of sound design possibilities. From atmospheric reverbs and rhythmic delays to expressive filters, LFOs, and dimensional enhancements, these modules offer composers the tools to sculpt the character of their choir. The artifacts parameter adds an extra layer of creative control, allowing users to infuse unique textures and nuances into their vocal arrangements.',
        image_url: ''
      },
      {
        title: 'Easy-To-Use Interface',
        description: 'Navigating the depths of Quoir\'s capabilities is effortless, thanks to its easy-to-use interface. With everything conveniently located on one screen, composers can efficiently access and control the various vocal engines, samples, and effects. This streamlined approach ensures a smooth and intuitive creative process, empowering users to craft haunting choral compositions with ease.',
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
      'Download Size': 'Installer: 90.6MB',
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

  console.log('✅ Successfully updated Quoir product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateQuoirProduct().catch(console.error);



