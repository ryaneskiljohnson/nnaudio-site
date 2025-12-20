import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateTacturesProduct() {
  console.log('=== Updating Tactures Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Tactures product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.tactures,name.ilike.%tactures%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Textured Drone Engine',
    short_description: 'Drag-&-Drop your own samples to express your lifestyle & experiences through audio. It does not require any fancy equipment, no expensive studio time & you don\'t even need High Quality recordings. In fact, some of the best results come with recordings from a cell phone. All you need is yourself, to be present in any given moment and to hit record!',
    description: `Drag-&-Drop your own samples to express your lifestyle & experiences through audio. It does not require any fancy equipment, no expensive studio time & you don't even need High Quality recordings. In fact, some of the best results come with recordings from a cell phone. All you need is yourself, to be present in any given moment and to hit record!

Convert Your Samples Into Cinematic Drone Textures

Embark on a sonic journey of texture and depth with Tactures, a unique drone texture sampler that transforms any audio sample into a playable key, creating rich and expressive drone instruments. The simplicity of Tactures lies in its drag-and-drop functionality, allowing users to effortlessly incorporate their own audio. Whether it's the ambient sounds of a bustling city or the serene chirping of birds captured on a cell phone, Tactures transforms everyday recordings into captivating playable textures.

Enhance and shape your textured drones with Tactures' built-in FX suite, offering a dynamic range of effects to add depth, character, and user control to your sounds. From subtle nuances to bold transformations, the FX suite provides the tools needed to sculpt your textures into a harmonious symphony of sonic landscapes. Tactures bridges the gap between simplicity and innovation, empowering users to create immersive and unique drone textures with ease.`,
    features: [
      {
        title: 'Unique Sampler Engine',
        description: 'Tactures opens up a realm of possibilities by allowing users to create a playable texture drone from any audio using intuitive drag-and-drop functionality. The magic lies in its use of 8 EQ Bell Curves, shaping the playable key with precision. Customize these Bell Curve parameters to craft a one-of-a-kind drone texture that resonates with your artistic vision. You can further enhance your sonic landscape with 2 customizable oscillators, providing a total of 3 voices to infuse texture and depth into your production.',
        image_url: ''
      },
      {
        title: 'Built-In Effect Modules',
        description: 'Tactures empowers users with a rich palette of effects, from the atmospheric ambiance of reverb and delay to the rhythmic modulation of LFOs and the spatial dynamics of autopan. This comprehensive suite not only enhances your textures but also provides nuanced control, allowing you to sculpt and refine every sonic detail. Whether you seek ethereal expanses or intricate layers, Tactures\' FX modules are the key to unlocking a world of sonic possibilities.',
        image_url: ''
      },
      {
        title: 'Easy-To-Use Interface',
        description: 'Navigate Tactures effortlessly through a well-designed interface where every editing parameter is intuitively presented on a single panel. With a simple click, access the presets panel, offering a quick and convenient way to search, save, and organize your textured drone creations. Save your unique presets with your own audio seamlessly, ensuring that your personalized soundscapes are easily retrievable for future use. Tactures prioritizes user convenience, making the exploration of textured drones a delightful and efficient process.',
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
      'Download Size': 'Installer: 30MB | Samples: 125MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG | Samples: ZIP',
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

  console.log('✅ Successfully updated Tactures product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateTacturesProduct().catch(console.error);



