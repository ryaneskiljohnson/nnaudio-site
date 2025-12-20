import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateSubFluxProduct() {
  console.log('=== Updating SubFlux Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get SubFlux product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.subflux-bass-module,slug.eq.subflux,name.ilike.%subflux%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Dual Bass Module',
    short_description: 'Create intense and gritty compositions that embody the chaos and energy of an impending cataclysm. Craft thunderous basslines that rumble and roar, evoking a sonic landscape teetering on the brink of devastation. Unleash a fusion of growling bass, distorted textures, and pulsating sub frequencies, as you explore the dystopian depths of sound design and shape a sonic world on the edge of collapse. Brace yourself for an audible journey that pushes the boundaries of bass-driven music.',
    description: `Create intense and gritty compositions that embody the chaos and energy of an impending cataclysm. Craft thunderous basslines that rumble and roar, evoking a sonic landscape teetering on the brink of devastation. Unleash a fusion of growling bass, distorted textures, and pulsating sub frequencies, as you explore the dystopian depths of sound design and shape a sonic world on the edge of collapse. Brace yourself for an audible journey that pushes the boundaries of bass-driven music.

Traverse The Sonic Wasteland & Create An Audible Dystopia

Subflux is a powerful bass plugin designed to elevate your low-end frequencies with precision and versatility. Boasting two sampler engines equipped with intuitive drag-and-drop capabilities, Subflux offers a seamless experience for composers and producers. Unleash your creativity by layering two distinct bass sounds or blending a kick with a bass, providing a wide spectrum of sonic possibilities. Each engine is individually editable, allowing you to fine-tune every aspect of your bass to achieve the perfect tone for your compositions.

Subflux doesn't just stop at sampling – it takes your bass to new heights with a comprehensive FX suite. Add punch, character, and depth to your bass sounds using the full range of effects available within Subflux. Elevate your productions with Subflux, a bass plugin that empowers you to shape the foundation of your music with precision and creativity.`,
    features: [
      {
        title: '2 Bass Samplers',
        description: 'Dive into the depth of your bass compositions with Subflux\'s dual sampler engines, providing the flexibility to layer distinct bass sounds or seamlessly combine a kick and bass. Each sampler engine is individually editable, allowing for precise adjustments to shape your low-end frequencies. The intuitive drag-and-drop feature empowers you to incorporate your own audio samples effortlessly, unlocking a realm of creative possibilities within your bass production.',
        image_url: ''
      },
      {
        title: 'Built-In Effect Modules',
        description: 'Shape and refine your bass elements with Subflux\'s built-in FX modules, offering a comprehensive suite of tools for sonic enhancement. From the dynamic shaper to the full dynamics module, chorus, EQ, and glide, Subflux provides a range of effects to add character, definition, and movement to your bass sounds. Whether you\'re seeking a smooth gliding effect or a punchy, dynamic presence, Subflux\'s FX modules provide the essential elements to sculpt your bass with precision.',
        image_url: ''
      },
      {
        title: 'Easy-To-Use Interface',
        description: 'Navigate your bass production journey seamlessly with Subflux\'s easy-to-use interface, featuring an intuitive design that puts creative control at your fingertips. The user-friendly layout ensures a straightforward and efficient workflow, allowing you to focus on crafting impactful basslines without the complexity. Subflux becomes a go-to tool for bass enthusiasts, offering both power and simplicity in a single, accessible interface.',
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
      'Download Size': 'Installer: 66MB | Samples: 73.6MB',
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

  console.log('✅ Successfully updated SubFlux product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateSubFluxProduct().catch(console.error);



