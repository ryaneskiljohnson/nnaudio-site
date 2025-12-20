import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Love the blending of 2 instruments',
    review_text: 'Love the blending of 2 instruments that complement each other.',
    customer_name: 'Armando R.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'I usually dont go for flutes much',
    review_text: 'I usually dont go for flutes much but this one hits different and I really like it definitely worth the purchase.',
    customer_name: 'Brian McNeil',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'I really like it!',
    review_text: 'I really like it! Affordable and fairly natural sounds especially in the mid tones. One faulty preset but otherwise did a great job for my purpose.',
    customer_name: 'Matt T.',
    is_verified_purchase: false,
    is_approved: true
  },
  {
    rating: 2,
    title: 'Only has one sound',
    review_text: 'Only has one sound',
    customer_name: 'Ernest P.',
    is_verified_purchase: false,
    is_approved: true
  },
  {
    rating: 5,
    title: 'there are not many good flute plugins out there',
    review_text: 'there are not many good flute plugins out there but this one is totally worth the money!',
    customer_name: 'Lukas R.',
    is_verified_purchase: false,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Apache Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Apache product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'apache-flute')
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

  console.log('\n✅ Successfully populated Apache reviews!');
}

populateReviews().catch(console.error);



