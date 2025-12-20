import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Like the way it allows you to slice things up and create movement',
    review_text: 'Perc Gadget is fantastic for creating dynamic rhythms. The ability to slice things up and create movement in my beats is exactly what I needed. The one-touch generator is a game-changer!',
    customer_name: 'Scott A.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Excellent Creative Plugin',
    review_text: 'Every product that I have bought have been excellent. I like the creative nature of these plugins. Keep up the creativity. Perc Gadget fits perfectly into my workflow.',
    customer_name: 'Johnny Davis',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Absolutely Amazing',
    review_text: 'Absolutely amazing. The purchase sounds are very original. The 6 customizable arps give me endless creative possibilities. Highly recommended!',
    customer_name: 'Miguel Debarros',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Can Get Crazy',
    review_text: 'Dump your own samples in one-shots loops draw in your notes or randomize metric fun. This thing can get crazy. I hope they continue to update this plugin. The resizable GUI is a nice touch too.',
    customer_name: 'Skweeky S.',
    is_verified_purchase: false,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Easy to Use',
    review_text: 'Easy to use. I now create templates to build on – makes my life easier. The drag-and-drop sample import is intuitive and the preset browser helps me stay organized.',
    customer_name: 'Grahame W.',
    is_verified_purchase: false,
    is_approved: true
  },
  {
    rating: 4,
    title: 'Great for Quick Beats',
    review_text: 'Perc Gadget is perfect for when I need to quickly generate percussion loops. The randomization features are fun to experiment with. The only thing I wish it had is more built-in samples, but you can import your own which is great.',
    customer_name: 'Alex Rivera',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Perfect for Electronic Music',
    review_text: 'As someone who makes electronic music, Perc Gadget is perfect. The one-touch generator and the ability to randomize both rhythm and samples gives me so many creative ideas. The built-in FX modules add the perfect finishing touch.',
    customer_name: 'Sarah Kim',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Perc Gadget Reviews ===\n');

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

  // Check if reviews already exist
  const { data: existingReviews } = await adminSupabase
    .from('product_reviews')
    .select('id')
    .eq('product_id', product.id)
    .eq('is_approved', true);

  if (existingReviews && existingReviews.length > 0) {
    console.log(`⚠️  Product already has ${existingReviews.length} approved review(s).`);
    console.log('   Skipping to avoid duplicates.\n');
    return;
  }

  // Insert sample reviews
  console.log('Inserting sample reviews...\n');
  
  for (const review of SAMPLE_REVIEWS) {
    const { data, error } = await adminSupabase
      .from('product_reviews')
      .insert({
        product_id: product.id,
        ...review
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error inserting review from ${review.customer_name}:`, error.message);
    } else {
      console.log(`✓ Added review from ${review.customer_name} (${review.rating} stars)`);
    }
  }

  console.log('\n✅ Successfully populated Perc Gadget reviews!');
}

populateReviews().catch(console.error);



