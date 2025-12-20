import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Digital Echoes has a useful combination of effects',
    review_text: 'Digital Echoes has a useful combination of effects: 3x Delay, Reverb, EQ and \'Dimension\'. The delays work as expected, except that there is a knob labeled "distance" which is really the delay "feedback". Just using the delays is possible to create a nice spacious feeling for an instrument whilst avoiding overcrowding the mix with too much reverb. Would be nice to have a knob to pan each delay. The delays can also create nice syncopated melodies from simple lines. With Reverb and Delay it is possible to create a really spacious feeling. Usually low wet values for the delays and reverb will work best, except in the cases where you really want to drawn the mix in reverb 🙂 I like the plugin, can create useful effects quickly, but I think the signal flow and knobs labelled "distance" instead of "feedback" will confuse some users.',
    customer_name: 'Cesar',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Super Plugin',
    review_text: 'Super Plugin, ich nutze es gern.',
    customer_name: 'Mike G.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 1,
    title: 'Don\'t like it',
    review_text: 'Don\'t like it. Think it is missing key features essential to delays that should be standard for all delay vsts',
    customer_name: 'Antoine Evans',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'nice plugin',
    review_text: 'nice plugin and very low cpu use',
    customer_name: 'edwin ayala',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'It\'s fun to create sounds',
    review_text: 'It\'s fun to create sounds because you can use three Delay, Reverb, and EQ functions on one screen.',
    customer_name: 'IKUO',
    is_verified_purchase: true,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Digital Echoes Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Digital Echoes product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.digital-echoes-delay,slug.eq.digital-echoes,name.ilike.%digital echoes%')
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

  console.log('\n✅ Successfully populated Digital Echoes reviews!');
}

populateReviews().catch(console.error);



