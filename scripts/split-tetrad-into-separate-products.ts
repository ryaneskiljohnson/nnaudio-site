import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

interface TetradProduct {
  name: string;
  slug: string;
  tagline: string;
  short_description: string;
  description: string;
  feature_title: string;
  feature_description: string;
}

const TETRAD_PRODUCTS: TetradProduct[] = [
  {
    name: 'Tetrad Keys',
    slug: 'tetrad-keys',
    tagline: 'Blended Keys Instrument',
    short_description: 'Unleash the soulful resonance of Tetrad Keys, a revolutionary plugin that fuses the warmth of analog keys, the precision of digital synths, and the authenticity of live-recorded piano.',
    description: `Unleash the soulful resonance of Tetrad Keys, a revolutionary plugin that fuses the warmth of analog keys, the precision of digital synths, and the authenticity of live-recorded piano. With four sound engines at your fingertips, blend these sonic elements to craft rich and expressive key arrangements. Each sound engine is individually editable, allowing you to fine-tune the character, attack, and resonance of your keys. Tetrad Keys introduces a new era of versatility in keyboard sound design, providing a seamless blend of traditional and modern tones.

Enhance your creative journey with Tetrad Keys' built-in FX modules, providing comprehensive control and endless possibilities for sound design. From lush reverbs to intricate delays, this plugin offers a suite of effects to shape your music. Unleash your creativity and explore the boundless potential of Tetrad Keys – a plugin that brings the best of analog, digital, and live instruments into one harmonious blend.`,
    feature_title: 'Four Sound Engines',
    feature_description: 'Blend up to four different key sources, each with its unique timbre and character. Individually edit these sources to perfect your tone, adjusting elements like attack, sustain, and resonance.',
  },
  {
    name: 'Tetrad Guitars',
    slug: 'tetrad-guitars',
    tagline: 'Blended Guitar Instrument',
    short_description: 'Dive into the world of Tetrad Guitars, where analog, digital, and live-recorded guitar tones converge to create a rich palette of sounds.',
    description: `Dive into the world of Tetrad Guitars, where analog, digital, and live-recorded guitar tones converge to create a rich palette of sounds. This plugin offers the flexibility to blend up to four guitar sources, each with its unique timbre and character. Individually edit these sources to perfect your tone, adjusting elements like attack, sustain, and tuning. Tetrad Guitars is your gateway to crafting dynamic and expressive guitar compositions, from classic riffs to experimental textures.

Enhance your creative journey with Tetrad Guitars' built-in FX modules, providing comprehensive control and endless possibilities for sound design. From lush reverbs to intricate delays, this plugin offers a suite of effects to shape your music. Unleash your creativity and explore the boundless potential of Tetrad Guitars – a plugin that brings the best of analog, digital, and live instruments into one harmonious blend.`,
    feature_title: 'Four Guitar Engines',
    feature_description: 'Blend up to four different guitar sources, each with its unique timbre and character. Individually edit these sources to perfect your tone, adjusting elements like attack, sustain, and tuning.',
  },
  {
    name: 'Tetrad Winds',
    slug: 'tetrad-winds',
    tagline: 'Blended Wind Instrument',
    short_description: 'Tetrad Winds redefines wind instrument emulation by combining the nuances of analog, digital, and live-recorded wind instruments in a single plugin.',
    description: `Tetrad Winds redefines wind instrument emulation by combining the nuances of analog, digital, and live-recorded wind instruments in a single plugin. With four sound engines, users can seamlessly blend an array of woodwind instruments to create harmonically rich wind arrangements. Each sound engine is independently editable, allowing precise control over your sound elements. Tetrad Winds opens a world of possibilities for composers and producers seeking authentic and versatile wind instrument sounds in their musical creations.

Enhance your creative journey with Tetrad Winds' built-in FX modules, providing comprehensive control and endless possibilities for sound design. From lush reverbs to intricate delays, this plugin offers a suite of effects to shape your music. Unleash your creativity and explore the boundless potential of Tetrad Winds – a plugin that brings the best of analog, digital, and live instruments into one harmonious blend.`,
    feature_title: 'Four Wind Engines',
    feature_description: 'Blend up to four different wind instrument sources, each with its unique timbre and character. Individually edit these sources to perfect your tone, adjusting elements like attack, sustain, and resonance.',
  },
];

async function splitTetradProduct() {
  console.log('=== Splitting Tetrad Series into Separate Products ===\n');

  const supabase = await createAdminClient();

  // 1. Get the existing tetrad-series product
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('slug', 'tetrad-series')
    .single();

  if (fetchError || !existingProduct) {
    console.error('❌ Error fetching tetrad-series product:', fetchError);
    return;
  }

  console.log(`Found existing product: ${existingProduct.name} (${existingProduct.id})\n`);

  // 2. Check if any of the new products already exist
  for (const product of TETRAD_PRODUCTS) {
    const { data: existing } = await supabase
      .from('products')
      .select('id, name, slug')
      .eq('slug', product.slug)
      .single();

    if (existing) {
      console.log(`⚠️  Product ${product.name} (${product.slug}) already exists. Skipping...`);
      continue;
    }

    // 3. Create new product based on existing tetrad product
    console.log(`Creating product: ${product.name}...`);

    // Filter downloads for this specific product
    const productDownloads = (existingProduct.downloads || []).filter((d: any) => {
      const path = d.path?.toLowerCase() || '';
      const name = d.name?.toLowerCase() || '';
      const slug = product.slug.toLowerCase();
      
      // Check if download path or name contains this product's identifier
      return path.includes(slug) || 
             path.includes(product.name.toLowerCase()) ||
             name.includes(slug) ||
             name.includes(product.name.toLowerCase());
    });

    console.log(`  Found ${productDownloads.length} downloads for ${product.name}`);

    const newProduct = {
      name: product.name,
      slug: product.slug,
      tagline: product.tagline,
      short_description: product.short_description,
      description: product.description,
      featured_image_url: existingProduct.featured_image_url, // Reuse same image for now
      background_image_url: existingProduct.background_image_url,
      price: existingProduct.price, // Use same price
      legacy_product_id: null, // Will need to be set separately if needed
      category: existingProduct.category || 'instrument-plugin', // Use existing category or default
      downloads: productDownloads.length > 0 ? productDownloads : [], // Only include relevant downloads
      features: [
        {
          title: product.feature_title,
          description: product.feature_description,
          image_url: '',
        },
      ],
      requirements: existingProduct.requirements || {
        mac: 'Mac Mojave 10.14+',
        ram: '4GB RAM',
        format: 'VST3 | AU',
        windows: 'Windows 10+',
        disk_space: '1GB Disk Space',
      },
      specifications: existingProduct.specifications || {
        'Format Type': 'VST3 | AU',
        'Download Size': 'Installer: ~80MB | Samples: ~400MB',
        'Delivery Format': 'WIN: EXE | MAC: PKG, Samples: ZIP',
        'Operating System': 'Windows 10+, Mac Mojave 10.14+',
        'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
        'System Requirements': '4GB RAM | 1GB Disk Space',
      },
    };

    const { data: createdProduct, error: createError } = await supabase
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (createError) {
      console.error(`❌ Error creating ${product.name}:`, createError);
      continue;
    }

    console.log(`✅ Created product: ${product.name} (${createdProduct.id})`);
    console.log(`   Downloads: ${productDownloads.length}`);
    console.log('');
  }

  console.log('✅ Successfully split Tetrad Series into separate products!');
  console.log('\n⚠️  Next steps:');
  console.log('   1. Update downloads for each product with correct paths');
  console.log('   2. Set legacy_product_id if needed');
  console.log('   3. Update product images if different for each product');
  console.log('   4. Consider deactivating or archiving the original tetrad-series product');
}

splitTetradProduct().catch(console.error);

