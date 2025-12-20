import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Haven\'t done A/B testing',
    review_text: 'Haven\'t done A/B testing with my other EQ plugs; but the interface is a sure winner.',
    customer_name: 'John F.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Beautiful interface',
    review_text: 'Beautiful interface, and useful algorithms to modify my personal sound!',
    customer_name: 'Aaron',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'I haven\'t gotten much use out of it yet',
    review_text: 'I haven\'t gotten much use out of it yet but with what I have, it seems helpful. It does what it should, and does it well. Thanks',
    customer_name: 'Nicholas N.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Simple but effective EQ',
    review_text: 'Simple but effective EQ, you only need to spend a short amount of time to get use to the EQ to get s performance as good as many of the more expensive EQs out there. This is a pro-grade tool especially for those on a tight budget.',
    customer_name: 'Milton Grimshaw',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'Pretty good',
    review_text: 'Pretty good, so far.',
    customer_name: 'Chris G.',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Curves EQ Reviews ===\n');

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

  console.log('\n✅ Successfully populated Curves EQ reviews!');
}

populateReviews().catch(console.error);



