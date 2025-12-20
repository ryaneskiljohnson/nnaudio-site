import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Fantastic tool for mashing up loops and drones',
    review_text: 'Fantastic tool for mashing up loops and drones – a true toy to play with that gets you great results. The morph blender is incredible for creating evolving textures. Highly recommended!',
    customer_name: 'Will',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'An interesting texture vst',
    review_text: 'An interesting texture vst, with possibility to add your own samples and tweak! The dynamic resonance control is really powerful. The interface could be a bit more intuitive, but overall a solid plugin.',
    customer_name: 'Anonymous',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 3,
    title: 'Good',
    review_text: 'Good plugin for texture generation. The 4 samplers work well together and the preset library is decent. Would like to see more sample slots or additional effects in future updates.',
    customer_name: 'Anonymous',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Curio Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Curio product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.curio-texture-generator,slug.eq.curio,name.ilike.%curio%')
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

  console.log('\n✅ Successfully populated Curio reviews!');
}

populateReviews().catch(console.error);



