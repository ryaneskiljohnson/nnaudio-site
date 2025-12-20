import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Sus VSTs son geniales',
    review_text: 'Sus VSTs son geniales conforme los he conocido NN Audio se ha convertido en una marca apreciada de plugins por su gran calidad me da gusto adquirirlos son sorprendentes muy buen trabajo.',
    customer_name: 'julio ramírez',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'THIS INSTRUMENT IS AMAZING',
    review_text: 'THIS INSTRUMENT IS AMAZING, HIGH QUALITY SOUNDS AND ALOT TO PICK FROM WITH A SIMPLE ENOUGH INTERFACE THAT IS EASY ENOUGH FOR ANYONE TO UNDERSTAND.',
    customer_name: 'Brian McNeil',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Great plugin',
    review_text: 'Great plugin. Adds some great depth to sounds. Best of all it was actually free with a purchase I made. I actually use this plugin more than the one I paid for!',
    customer_name: 'Miguel Debarros',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'Lush Rompler with really nice FX',
    review_text: 'Lush Rompler with really nice FX included. Nothing to miss. Great for beginners and veterans alike.',
    customer_name: 'Anonymous',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Great tool/VST to have',
    review_text: '\'Digital Dreamscape\' is a great tool/VST to have, especially if you\'re looking for a wide range of manipulable options. I\'m still learning and new to it, but it has some great, useful sounds, and lots of ways to modify them. So far, I give this plug-in a 5/5!',
    customer_name: 'Nicholas',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating DigitalDreamscape Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get DigitalDreamscape product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.digitaldreamscape-quad-rompler,slug.eq.digitaldreamscape,name.ilike.%digitaldreamscape%')
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

  console.log('\n✅ Successfully populated DigitalDreamscape reviews!');
}

populateReviews().catch(console.error);



