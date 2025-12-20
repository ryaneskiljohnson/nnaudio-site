import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'The Sounds are phenomenal',
    review_text: 'The Sounds are phenomenal, great synth',
    customer_name: 'William Davis',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'After purchasing the incredible Blaque',
    review_text: 'After purchasing the incredible Blaque – Dark Electric Guitar, which since then has become my absolute favourite clean guitar plugin, I decided to purchase Numb as I also needed an acoustic guitar VST. And man, I am super happy with this purchase as well! The sound is truly amazing, especially when you select the "256 voices" option in the settings. I am hoping the developer will make a "Dark Bass" plugin as well, to accompany the guitars. That will be an insta-buy from me. Hint, hint!',
    customer_name: 'Andrea Kovacs',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'I use the product often',
    review_text: 'I use the product often. It\'s hard to find good guitar VSTs but this is one of my favourites.',
    customer_name: 'Anonymous',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'nice sounds',
    review_text: 'nice sounds',
    customer_name: 'Anonymous',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'I bought Blaque a month ago',
    review_text: 'I bought Blaque a month ago and was waiting for Numb to go on sale. Soon as I saw it i bought it. Did not know I had a coupon and could\'ve save more but great guitar. Love the layering aspect and fret noise.',
    customer_name: 'anthony w.',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Numb Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Numb product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'numb')
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

  console.log('\n✅ Successfully populated Numb reviews!');
}

populateReviews().catch(console.error);



