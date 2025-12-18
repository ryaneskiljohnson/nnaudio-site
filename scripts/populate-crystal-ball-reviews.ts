import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Absolutely Amazing Plugin!',
    review_text: 'Crystal Ball has completely transformed my workflow. The Magic Button feature is genius - I can generate infinite variations of effects with just one click. The interface is intuitive and the sound quality is outstanding. Highly recommended!',
    customer_name: 'Alex Thompson',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Best Multi-Effect Plugin I\'ve Used',
    review_text: 'The 250 presets are incredible, and the ability to create my own is a game-changer. The MIDI CC learn feature makes it so easy to integrate into my setup. The undo/redo functionality works perfectly, even with the Magic Button. Worth every penny!',
    customer_name: 'Sarah Martinez',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Incredible Value for Money',
    review_text: 'I\'ve been using Crystal Ball for a few months now and it\'s become an essential part of my production toolkit. The 10 effect chains give me so much flexibility, and the tooltips help me understand what each parameter does. The GUI is beautiful and easy to navigate.',
    customer_name: 'Michael Chen',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'Great Plugin with Minor Suggestions',
    review_text: 'Really solid plugin overall. The Magic Button is fun to use and generates some interesting effects. I wish there were more presets in certain categories, but the 250 included are a good starting point. The preset browser is easy to use and search through.',
    customer_name: 'Jordan Williams',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Perfect for Experimental Music',
    review_text: 'As someone who makes experimental electronic music, Crystal Ball is perfect. The ability to transform any audio into something completely different is amazing. The Magic Button has given me so many creative ideas I never would have thought of. The interface is clean and the workflow is smooth.',
    customer_name: 'Riley Davis',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Crystal Ball Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Crystal Ball product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
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

  console.log('\n✅ Successfully populated Crystal Ball reviews!');
}

populateReviews().catch(console.error);

