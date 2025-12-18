import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function updateCrystalBallFeatures() {
  const adminSupabase = await createAdminClient();

  // Get the product
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (fetchError || !product) {
    console.error('Error fetching product:', fetchError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})`);

  // Features with descriptions from old site
  // Note: Image URLs will need to be added manually or scraped from the old site
  const features = [
    {
      title: 'Generate Infinite Effects',
      description: 'Unleash a world of endless sonic possibilities with the "Magic Button." With a single click, completely transform your audio into something extraordinary. This powerful feature includes an undo/redo option, ensuring you never miss a moment of your creative journey and can effortlessly explore new ideas.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: '250 Stock Presets',
      description: 'Dive into a treasure trove of inspiration with 250 meticulously crafted presets. Whether you\'re seeking subtle enhancements or dramatic transformations, these presets provide instant creative sparks, showing you just how far your audio can go and helping you find the perfect starting point for your next masterpiece.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: 'MIDI CC + Learn',
      description: 'Simplify your workflow with the seamless MIDI CC assignment. Quickly and easily map your MIDI CC parameters to the plugin\'s controls, enhancing your creative control. With the added convenience of MIDI CC Learn, assigning parameters is faster and more intuitive than ever, allowing you to focus on making music.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: 'Intuitive GUI',
      description: 'Experience the ease of use with our intuitive graphical user interface (GUI). Designed for quick access and effortless navigation, the GUI ensures that all the tools you need are right at your fingertips. Its user-friendly layout empowers you to dive into your creative process without any barriers, making it a breeze to shape your sound.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: '10 Complete Effect Chains',
      description: 'The Crystal Ball features 10 complete effect chains, each with 10 shimmering knobs that allow you to summon and manipulate a symphony of otherworldly effects with ease.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: 'Transform Any Audio Into A Modern Masterpiece',
      description: 'As if guided by unseen spirits, the Crystal Ball transforms mundane sounds into bewitching audio spells, weaving intricate sonic tapestries that captivate and ensnare the listener.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: 'Easily Undo/Redo Any Change, Including The "Magic Button" Generator',
      description: 'Never lose your creative momentum. The Crystal Ball includes comprehensive undo/redo functionality that works with all changes, including the Magic Button generator, ensuring you can explore fearlessly.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: 'Easy-To-Use Preset Browser for Searching & Creating your own presets',
      description: 'Navigate through your presets with ease. The intuitive preset browser makes it simple to search, organize, and create your own custom presets, streamlining your workflow.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: 'Tooltip To Help Learn & Understand The Plugin',
      description: 'Built-in tooltips provide helpful guidance as you explore the plugin, making it easy to learn and understand each parameter and feature.',
      image_url: '' // TODO: Add image/gif URL
    },
    {
      title: 'Intuitive single window interface & parameters',
      description: 'Everything you need is accessible from a single, intuitive window. The streamlined interface keeps all parameters within easy reach, eliminating the need to navigate through multiple windows or menus.',
      image_url: '' // TODO: Add image/gif URL
    }
  ];

  // Update the product
  const { data: updatedProduct, error: updateError } = await adminSupabase
    .from('products')
    .update({ features })
    .eq('id', product.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Crystal Ball features');
  console.log(`Updated ${features.length} features with descriptions`);
  console.log('\n⚠️  Note: Image URLs need to be added manually or scraped from the old site');
  console.log('   You can edit the product in the admin panel to add image/gif URLs for each feature');
}

updateCrystalBallFeatures().catch(console.error);

