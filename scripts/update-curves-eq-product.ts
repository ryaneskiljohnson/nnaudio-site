import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateCurvesEQProduct() {
  console.log('=== Updating Curves EQ Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Curves EQ product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'curves-eq')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Multi-EQ Tool',
    short_description: 'Navigate a digital landscape, effortlessly sculpting up to 16 bands and frequencies in perfect harmony. Shape your sound with surgical precision, enhancing clarity, depth, and richness across the audio spectrum. Embrace the sleek interface that allows you to shape frequencies with the finesse of a digital virtuoso. Create a sonic masterpiece, resonating with a clarity that transcends the boundaries of time and space resulting in a sonic tapestry that defies conventional boundaries.',
    description: `Navigate a digital landscape, effortlessly sculpting up to 16 bands and frequencies in perfect harmony. Shape your sound with surgical precision, enhancing clarity, depth, and richness across the audio spectrum. Embrace the sleek interface that allows you to shape frequencies with the finesse of a digital virtuoso. Create a sonic masterpiece, resonating with a clarity that transcends the boundaries of time and space resulting in a sonic tapestry that defies conventional boundaries.

Dive Deep Into The Matrix Of Frequencies

Dive into precision audio sculpting with this innovative Multi EQ tool that revolutionizes your sound design experience. With four EQs seamlessly integrated into a single plugin, Curves offers unparalleled flexibility in shaping your sonic landscape. Each EQ boasts four distinct bands, allowing you to fine-tune frequencies with surgical precision. Navigating through these EQs is a breeze, thanks to the intuitive EQ buttons that enable quick jumps between them. What sets Curves apart is the visual feast it provides on the frequency grid – each EQ is color-coded, allowing you to easily discern and adjust settings, making your EQ adjustments not just auditory but a visually immersive experience.

Curves is more than a mere EQ tool; it\'s a dynamic visual canvas for your sound engineering journey. Witness the harmony of colors on the frequency grid, each hue representing a unique EQ, as you craft a symphony of frequencies with unparalleled ease. Whether you are enhancing clarity, sculpting tonal balance, or diving into creative frequency manipulation, Curves empowers you to shape your sound with both precision and artistic flair.`,
    features: [
      {
        title: 'Four EQs with 16 Bands',
        description: 'Curves offers unrivaled control with its four independently editable EQ modules, each containing four unique bands, giving you a total of 16 EQ bands to manipulate. Whether you are aiming to enhance specific frequency ranges, eliminate unwanted noise, or achieve perfectly balanced tonality, this multi-EQ setup allows for highly detailed frequency sculpting. Each band can be customized to perform precise adjustments, enabling you to fine-tune every aspect of your sound design with surgical accuracy.',
        image_url: ''
      },
      {
        title: 'Visualize in Real-Time',
        description: 'Curves elevates your EQ experience by providing real-time, color-coded visual feedback for each EQ on a frequency grid. This makes navigating and adjusting your settings incredibly intuitive, as you can easily distinguish and manage multiple EQs at once. The ability to see all four EQs superimposed on the visualizer, each with its own color, allows you to monitor the interaction between them effortlessly. Whether you are isolating a specific frequency or sculpting a complex sound, this visual tool ensures a more immersive and efficient workflow.',
        image_url: ''
      },
      {
        title: 'Streamlined Workflow',
        description: 'Curves is designed to not only enhance your sound but also simplify your workflow. The easy-to-use preset browser allows you to quickly save, access, and manage your custom EQ settings, while also providing 10 expertly crafted factory presets to inspire your sound-shaping journey. The user-friendly interface ensures that you can seamlessly navigate between EQ modules, switch band types, and use the convenient BYPASS function to instantly compare your original source with the EQ-processed version. This intuitive design makes the entire EQ process more streamlined, allowing you to focus on creativity without being slowed down by technical hurdles.',
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
      'Download Size': 'Installer: 45MB',
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

  console.log('✅ Successfully updated Curves EQ product data!');
  console.log('\n⚠️  Note: Feature images need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updateCurvesEQProduct().catch(console.error);



