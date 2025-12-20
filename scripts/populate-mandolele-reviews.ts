import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'A nice, different addition to your sound library',
    review_text: 'Overall: A nice, different addition to your sound library. Ukelele and Mandolin, both played with finger and pick. Good for chords and single note runs. I wouldn\'t use as a solo instrument but it sounds very good in a mix with others. Pros: Good sounds and sound combinations, Easy to understand, quick to set up, Nice preset management, "Waves" effect is like tremelo and fits the sounds well depending on what you want. Resizeable interface. Flexible: I was able to get close to a banjo sound by choosing Basic Mandolin 1, setting Waves as slow as it goes, setting Artifacts Q very low, lowering release time on the Mandolin sound. Be sure to try full range of notes, bass notes sound great even if not like a real instrument!',
    customer_name: 'Dave T.',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 4,
    title: 'The interface is different',
    review_text: 'The interface is different, and the sound is definitely different!',
    customer_name: 'Anonymous',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Another great plugin',
    review_text: 'Another great plugin from the folks at NNaudio and I also got this one free too with my purchase. 20 dollar purchase got me PLUGIN with 2 free ones.',
    customer_name: 'Miguel Debarros',
    is_verified_purchase: true,
    is_approved: true
  },
  {
    rating: 5,
    title: 'Really versatile sample based plugin',
    review_text: 'Mandolele is a really versatile sample based plugin, which is great for Mandolin and Ukulele sounds. The plugin is well designed and has a number of good parameters for sound shaping.',
    customer_name: 'Andrew S.',
    is_verified_purchase: false,
    is_approved: true
  },
  {
    rating: 5,
    title: 'This is a good sounding instrument!',
    review_text: 'This is a good sounding instrument! I\'m happy with my purchase.',
    customer_name: 'Elliot M.',
    is_verified_purchase: false,
    is_approved: true
  }
];

async function populateReviews() {
  console.log('=== Populating Mandolele Reviews ===\n');

  const adminSupabase = await createAdminClient();

  // Get Mandolele product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.mandolele-mandolin-ukulele,slug.eq.mandolele,name.ilike.%mandolele%')
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

  console.log('\n✅ Successfully populated Mandolele reviews!');
}

populateReviews().catch(console.error);



