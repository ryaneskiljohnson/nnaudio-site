import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Blaque is a phenomenal Plug In',
    review_text: 'Blaque is a phenomenal Plug In',
    customer_name: 'William Davis',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'I am thoroughly impressed!',
    review_text: 'I am thoroughly impressed! Excellent sound, easy-to-use interface! Good job! It will be perfect for darkwave/post-punk! Please consider further developing this awesome VST to become even better!',
    customer_name: 'Zsolt Monostori',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Awesome guitar sounds',
    review_text: 'Awesome guitar sounds in this vst! Use it very very often!',
    customer_name: 'demar w.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Best vst ever',
    review_text: 'Best vst ever, especially for trap guitar.',
    customer_name: 'Lucky P.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'Quite unique',
    review_text: 'Quite unique',
    customer_name: 'Paul Clements',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Blaque Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Blaque product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'blaque')
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

  console.log('\n✅ Successfully populated Blaque reviews!');
}

populateReviews().catch(console.error);



