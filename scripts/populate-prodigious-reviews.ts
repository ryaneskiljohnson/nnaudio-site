import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'I really enjoyed this VST',
    review_text: 'I really enjoyed this VST, Simple yet great vibes!',
    customer_name: 'Armando R.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Un plugin molto interessante',
    review_text: 'Un plugin molto interessante per versatilità e completezza di suoni sia singoli che multipli in un contesto che emula una piccola orchestra con sonorità dignitosissime.',
    customer_name: 'Saverio Giugliano',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Prodigious Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Prodigious product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.prodigious,name.ilike.%prodigious%')
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

  console.log('\n✅ Successfully populated Prodigious reviews!');
}

populateReviews().catch(console.error);



