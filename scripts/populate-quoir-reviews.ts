import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Over a good one',
    review_text: 'Over a good one, just need more presets!',
    customer_name: 'Armando R.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'I like this instrument a lot',
    review_text: 'I like this instrument a lot, but I feel its potential is not being realized. The samples are solid and the user interface is quite clever, but there just are not enough presets provided to show off what this can do.',
    customer_name: 'Joseph M.',
    is_verified_purchase: false,
    is_approved: true
  },
  {
    rating: 4,
    title: 'love it',
    review_text: 'love it',
    customer_name: 'Adrian V.',
    is_verified_purchase: false,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Quoir Reviews ===\n');

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

  console.log('\n✅ Successfully populated Quoir reviews!');
}

populateReviews().catch(console.error);



