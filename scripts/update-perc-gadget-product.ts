import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import https from 'https';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const TEMP_DIR = path.join(__dirname, '../temp-images');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function downloadFile(url: string, filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          downloadFile(response.headers.location, filePath).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        console.error(`  ❌ Failed to download: ${response.statusCode}`);
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        resolve(false);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      console.error(`  ❌ Error downloading: ${err.message}`);
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      resolve(false);
    });
  });
}

async function uploadToSupabase(filePath: string, fileName: string, contentType: string = 'image/jpeg'): Promise<string | null> {
  const adminSupabase = await createAdminClient();
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error(`  ❌ Upload error: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = adminSupabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`  ❌ Error uploading: ${error.message}`);
    return null;
  }
}

async function updatePercGadgetProduct() {
  console.log('=== Updating Perc Gadget Product ===\n');

  const adminSupabase = await createAdminClient();

  // Get Perc Gadget product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.perc-gadget,slug.eq.perc-gadget-rhythm-generator,name.ilike.%perc gadget%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Product data from old site
  const productData: any = {
    tagline: 'Dynamic Rhythm Generator',
    short_description: 'Step into the digital frontier with Perc Gadget, your essential piece of rhythmic technology. This one-touch rhythm generator transforms your beats, offering cinematic precision in a world where gadgets are indispensable.',
    description: `Step into the digital frontier with Perc Gadget, your essential piece of rhythmic technology. This one-touch rhythm generator transforms your beats, offering cinematic precision in a world where gadgets are indispensable. Craft unique drum and percussion loops effortlessly, as six customizable arpeggiator engines lead you through a sonic landscape defined by sample and rhythm randomization. Load your own samples for an even more unique experience.

Innovation And Rhythm Converge

Introducing "Perc Gadget," your One Touch Rhythm Generator. With the simplicity of just pressing a single button, you can effortlessly generate dynamic drum and percussion loops using its 6 customizable percussion arpeggiator engines. Each engine empowers you to individually randomize both the sample and rhythm, providing endless possibilities for creativity. You can also import your own WAV samples for a more creative workflow.

Enhance your rhythms with the plugin's simple yet powerful built-in effect modules, adding a layer of depth and character to your percussion sounds. Perc Gadget is designed to be your go-to tool for quick and inspiring drum patterns, making beat creation a seamless and enjoyable process. Elevate your music production with the ease and versatility of Perc Gadget!`,
    features: [
      {
        title: '6 Customizable Arps',
        description: 'Perc Gadget puts the power in your hands with six percussion arpeggiator engines, allowing you to choose or randomize samples. Dive into individual sample parameters like pitch envelope, ADSR envelope, EQ, gain, pan, transpose, and detune. Tweak or let randomness take the lead in shaping your rhythmic experience. Whether you prefer precise adjustments or embrace the randomness, these engines empower you to shape a unique sonic journey.',
        image_url: ''
      },
      {
        title: 'Randomize Your Rhythm',
        description: 'Embrace the spontaneity of music creation with Perc Gadget\'s rhythmic prowess. Globally or individually randomize the intricate rhythms of its Percussion Arpeggiator Engines, ensuring that each beat unfolds with a nuanced cadence that defies predictability. Make on-the-fly adjustments to Steps, Rate, Stride, and Velocity, injecting a dynamic and evolving pulse into your compositions. Each beat you compile possesses a distinct rhythmic fingerprint.',
        image_url: ''
      },
      {
        title: 'Randomize Your Samples',
        description: 'Elevate your sonic palette by globally or individually randomizing the loaded samples in your Percussion Arpeggiator Engines. This dynamic feature lets you seamlessly swap samples on the fly, fostering a continuous flow of creative exploration. As you navigate through an array of sounds, Perc Gadget ensures that the journey is as exciting as the destination. Open endless possibilities for your sonic exploration. Want more creativity at your fingertips? You can dynamically load your own samples as well.',
        image_url: ''
      },
      {
        title: 'Use Your Own Samples',
        description: 'Crafting your unique percussion soundscapes is easier than ever. Simply drag your favorite WAV samples directly into Perc Gadget, instantly integrating them into your compositions. Whether you\'re layering familiar sounds or experimenting with new textures, this intuitive feature empowers you to personalize your percussion effortlessly. Save custom presets with your imported audio files. Elevate your music production experience with Perc Gadget\'s enhanced versatility and unleash your creativity like never before',
        image_url: ''
      },
      {
        title: 'One-Touch Generator + FX',
        description: 'Experience the magic of instant creativity with Perc Gadget\'s one-touch generator. By pressing and holding B3, Drawing B3 MIDI Note, or using the Play Button, you can unlock a vast array of percussion loops effortlessly. Perc Gadget offers a suite of effects to shape and enrich your sounds. From the nuanced warmth of the Glue Compressor to the precision of the Draggable EQ Panel, each module provides a layer of sonic refinement. Reverb, Swing, and Dimension further expand your sonic landscape, ensuring that every beat is imbued with depth, character, and a touch of sonic artistry.',
        image_url: ''
      },
      {
        title: 'Intuitive & Resizable GUI',
        description: 'Perc Gadgets easy to navigate layout allows you to demo, edit, import & more in a flash. The majority of the plugin is on single screen which saves you time & improves your workflow. Need some extra space on your monitor? No Problem! Just use the "Resize" slider to edit the size of the plugin GUI. You can resize Perc Gadget to about 50% of the original size.',
        image_url: ''
      }
    ],
    requirements: {
      mac: 'Mac Mojave 10.14+',
      ram: '4GB RAM',
      format: 'VST3 | AU',
      windows: 'Windows 10+',
      disk_space: '100MB Disk Space'
    },
    specifications: {
      'Format Type': 'VST3 | AU',
      'Download Size': 'Installer: 25MB | Samples: 11MB',
      'Delivery Format': 'WIN: EXE | MAC: PKG',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
      'System Requirements': '4GB RAM | 100MB Disk Space'
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

  console.log('✅ Successfully updated Perc Gadget product data!');
  console.log('\n⚠️  Note: Feature images/GIFs need to be downloaded and uploaded separately');
  console.log('   GUI image also needs to be downloaded and uploaded');
}

updatePercGadgetProduct().catch(console.error);



