/**
 * @fileoverview Generates authentic example reviews for products
 * @module scripts/generate-product-reviews
 * 
 * Creates realistic reviews similar to Apache Flute's style:
 * - Mix of ratings (2-5 stars)
 * - Authentic, sometimes casual language
 * - Product-relevant feedback
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  short_description: string | null;
}

interface Review {
  rating: number;
  title: string;
  review_text: string;
  customer_name: string;
  is_verified_purchase: boolean;
}

const REVIEWER_NAMES = [
  'Mike T.', 'Sarah K.', 'James R.', 'Lisa M.', 'David P.',
  'Emily W.', 'Chris B.', 'Amanda H.', 'Jason L.', 'Nicole S.',
  'Ryan G.', 'Jessica M.', 'Matt C.', 'Katie F.', 'Brian McNeil',
  'Taylor J.', 'Jordan A.', 'Alex K.', 'Sam D.', 'Morgan R.',
  'Casey M.', 'Drew P.', 'Riley T.', 'Blake S.', 'Avery L.',
  'Quinn W.', 'Sage B.', 'River H.', 'Dakota M.', 'Phoenix K.',
  'Ernest P.', 'Lukas R.', 'Armando R.', 'Marcus V.', 'Tony S.',
  'Adrian K.', 'Carlos G.', 'Elena R.', 'Maya L.', 'Noah Chen'
];

/**
 * @brief Generates reviews for instrument plugins
 */
function generateInstrumentReviews(product: Product): Review[] {
  const reviews: Review[] = [];
  const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews
  
  const positiveTemplates = [
    { title: 'Great sound quality', text: 'really nice sounds, exactly what I was looking for. worth the money!', rating: 5 },
    { title: 'Love it!', text: 'been using this a lot lately. sounds professional and easy to use', rating: 5 },
    { title: 'Perfect for my productions', text: 'fits perfectly in my mixes. CPU friendly too which is nice', rating: 4 },
    { title: 'Solid plugin', text: 'good quality samples and the interface is pretty straightforward', rating: 4 },
    { title: 'Really impressed', text: 'I usually dont buy plugins like this but this one is definitely worth it', rating: 5 },
    { title: 'Works great', text: 'easy to use and sounds good. no complaints here', rating: 4 },
    { title: 'Awesome addition to my toolkit', text: 'been using this on every track lately. super versatile', rating: 5 },
  ];
  
  const criticalTemplates = [
    { title: 'Not bad but could be better', text: 'its decent but i was expecting a bit more variety in sounds', rating: 3 },
    { title: 'Good but limited', text: 'sounds are good quality but wish there were more presets included', rating: 3 },
    { title: 'Ok for the price', text: 'nothing groundbreaking but gets the job done', rating: 3 },
    { title: 'Could use more features', text: 'basic functionality works well but missing some features I would want', rating: 2 },
  ];
  
  const templates = [...positiveTemplates, ...criticalTemplates];
  
  for (let i = 0; i < numReviews; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    reviews.push({
      ...template,
      customer_name: REVIEWER_NAMES[Math.floor(Math.random() * REVIEWER_NAMES.length)],
      is_verified_purchase: Math.random() > 0.4 // 60% verified
    });
  }
  
  return reviews;
}

/**
 * @brief Generates reviews for MIDI packs
 */
function generatePackReviews(product: Product): Review[] {
  const reviews: Review[] = [];
  const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews
  
  const positiveTemplates = [
    { title: 'fire pack', text: 'these MIDI files are super useful. saved me so much time', rating: 5 },
    { title: 'Tons of inspiration', text: 'great variety of loops and progressions. been using it a lot', rating: 5 },
    { title: 'Worth every penny', text: 'quality midi loops that actually work well in different genres', rating: 4 },
    { title: 'Really good pack', text: 'solid collection. the loops are well organized and easy to work with', rating: 4 },
    { title: 'Instant inspiration', text: 'helped me finish like 3 tracks already. definitely recommend', rating: 5 },
    { title: 'Great for beat making', text: 'lots of good chord progressions and melodies to work with', rating: 5 },
    { title: 'Excellent value', text: 'you get a ton of content for the price. all quality stuff too', rating: 5 },
  ];
  
  const criticalTemplates = [
    { title: 'Some good some bad', text: 'half the loops are useful but the other half are kinda basic', rating: 3 },
    { title: 'Hit or miss', text: 'few gems in here but had to dig through a lot to find what works', rating: 3 },
    { title: 'Expected more variety', text: 'loops are decent but they all sound pretty similar', rating: 2 },
  ];
  
  const templates = [...positiveTemplates, ...criticalTemplates];
  
  for (let i = 0; i < numReviews; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    reviews.push({
      ...template,
      customer_name: REVIEWER_NAMES[Math.floor(Math.random() * REVIEWER_NAMES.length)],
      is_verified_purchase: Math.random() > 0.3 // 70% verified
    });
  }
  
  return reviews;
}

/**
 * @brief Generates reviews for audio FX plugins
 */
function generateAudioFXReviews(product: Product): Review[] {
  const reviews: Review[] = [];
  const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews
  
  const positiveTemplates = [
    { title: 'Unique sound', text: 'never heard effects like this before. really creative', rating: 5 },
    { title: 'Great for experimental stuff', text: 'if you like weird sounds this is perfect. super fun to mess with', rating: 5 },
    { title: 'Cool plugin', text: 'adds some interesting textures to my tracks. easy to use too', rating: 4 },
    { title: 'Love the sound design', text: 'creates some really interesting effects. definitely unique', rating: 5 },
    { title: 'Perfect for creative processing', text: 'been using this on everything lately. so many possibilities', rating: 4 },
  ];
  
  const criticalTemplates = [
    { title: 'Interesting but niche', text: 'cool effects but not something i use everyday', rating: 3 },
    { title: 'Takes time to learn', text: 'powerful plugin but the learning curve is steep', rating: 3 },
    { title: 'Not for everyone', text: 'very experimental. might be too out there for most people', rating: 3 },
  ];
  
  const templates = [...positiveTemplates, ...criticalTemplates];
  
  for (let i = 0; i < numReviews; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    reviews.push({
      ...template,
      customer_name: REVIEWER_NAMES[Math.floor(Math.random() * REVIEWER_NAMES.length)],
      is_verified_purchase: Math.random() > 0.4 // 60% verified
    });
  }
  
  return reviews;
}

/**
 * @brief Generates reviews for MIDI FX plugins
 */
function generateMIDIFXReviews(product: Product): Review[] {
  const reviews: Review[] = [];
  const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews
  
  const positiveTemplates = [
    { title: 'Game changer for MIDI', text: 'totally transforms my MIDI workflow. super creative tool', rating: 5 },
    { title: 'Really cool concept', text: 'love what this does to my melodies. makes everything more interesting', rating: 5 },
    { title: 'Powerful tool', text: 'takes a bit to understand but once you get it its amazing', rating: 4 },
    { title: 'Inspiring', text: 'helps me come up with ideas i wouldnt have thought of otherwise', rating: 5 },
    { title: 'Creative and fun', text: 'been experimenting with this a lot. really opens up new possibilities', rating: 4 },
  ];
  
  const criticalTemplates = [
    { title: 'Needs more documentation', text: 'cool plugin but wish there were better tutorials on how to use it', rating: 3 },
    { title: 'Interesting but complex', text: 'powerful but takes awhile to figure out what everything does', rating: 3 },
  ];
  
  const templates = [...positiveTemplates, ...criticalTemplates];
  
  for (let i = 0; i < numReviews; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    reviews.push({
      ...template,
      customer_name: REVIEWER_NAMES[Math.floor(Math.random() * REVIEWER_NAMES.length)],
      is_verified_purchase: Math.random() > 0.4 // 60% verified
    });
  }
  
  return reviews;
}

/**
 * @brief Generates reviews for bundles
 */
function generateBundleReviews(product: Product): Review[] {
  const reviews: Review[] = [];
  const numReviews = Math.floor(Math.random() * 2) + 2; // 2-3 reviews
  
  const positiveTemplates = [
    { title: 'Incredible value', text: 'way better than buying everything separately. great bundle', rating: 5 },
    { title: 'Best purchase', text: 'saves so much money and you get everything you need', rating: 5 },
    { title: 'Perfect starter pack', text: 'if youre new definitely get this. has everything', rating: 5 },
    { title: 'Great collection', text: 'all quality products bundled together. totally worth it', rating: 4 },
  ];
  
  const criticalTemplates = [
    { title: 'Good but expensive', text: 'everything in here is good but still a big investment', rating: 3 },
  ];
  
  const templates = [...positiveTemplates, ...criticalTemplates];
  
  for (let i = 0; i < numReviews; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    reviews.push({
      ...template,
      customer_name: REVIEWER_NAMES[Math.floor(Math.random() * REVIEWER_NAMES.length)],
      is_verified_purchase: Math.random() > 0.5 // 50% verified for bundles
    });
  }
  
  return reviews;
}

/**
 * @brief Main review generator dispatcher
 */
function generateReviews(product: Product): Review[] {
  if (product.category === 'instrument-plugin') {
    return generateInstrumentReviews(product);
  } else if (product.category === 'pack') {
    return generatePackReviews(product);
  } else if (product.category === 'audio-fx-plugin') {
    return generateAudioFXReviews(product);
  } else if (product.category === 'midi-fx-plugin') {
    return generateMIDIFXReviews(product);
  } else if (product.category === 'bundle') {
    return generateBundleReviews(product);
  } else if (product.category === 'application') {
    return [
      { rating: 5, title: 'So convenient', text: 'makes managing all my plugins way easier. no more hunting for download links', customer_name: 'Alex K.', is_verified_purchase: true },
      { rating: 4, title: 'Works well', text: 'clean interface and does what it says. would like to see more features though', customer_name: 'Jordan M.', is_verified_purchase: true },
    ];
  }
  
  return [];
}

/**
 * @brief Inserts reviews for a product
 */
async function addReviewsToProduct(product: Product): Promise<number> {
  const reviews = generateReviews(product);
  
  if (reviews.length === 0) {
    return 0;
  }
  
  let inserted = 0;
  
  for (const review of reviews) {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          id: crypto.randomUUID(),
          product_id: product.id,
          rating: review.rating,
          title: review.title,
          review_text: review.review_text,
          customer_name: review.customer_name,
          customer_email: null,
          user_id: null,
          is_verified_purchase: review.is_verified_purchase,
          is_approved: true,
          created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 90 days
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error(`  ❌ Failed to insert review: ${error.message}`);
      } else {
        inserted++;
      }
    } catch (error) {
      console.error(`  ❌ Error inserting review:`, error);
    }
  }
  
  return inserted;
}

/**
 * @brief Main function
 */
async function main() {
  console.log('\n🌟 Generating Product Reviews\n');
  console.log('Creating authentic, varied reviews for all products...\n');
  
  // Get products without reviews
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, short_description')
    .not('name', 'ilike', '%cymasphere%')
    .order('category, name');
  
  if (error || !products) {
    console.error('Failed to fetch products:', error);
    process.exit(1);
  }
  
  // Filter to only products without reviews
  const productsNeedingReviews: Product[] = [];
  
  for (const product of products) {
    const { count } = await supabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id);
    
    if (!count || count === 0) {
      productsNeedingReviews.push(product);
    }
  }
  
  console.log(`Found ${productsNeedingReviews.length} products needing reviews\n`);
  
  let totalReviews = 0;
  let productsUpdated = 0;
  
  for (const product of productsNeedingReviews) {
    console.log(`📝 ${product.name}`);
    const reviewsAdded = await addReviewsToProduct(product);
    
    if (reviewsAdded > 0) {
      console.log(`   ✅ Added ${reviewsAdded} reviews`);
      totalReviews += reviewsAdded;
      productsUpdated++;
    } else {
      console.log(`   ⚠️  No reviews generated`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`REVIEW GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Products updated: ${productsUpdated}`);
  console.log(`✅ Total reviews added: ${totalReviews}`);
  console.log(`📊 Average reviews per product: ${(totalReviews / productsUpdated).toFixed(1)}`);
  console.log(`${'='.repeat(60)}\n`);
}

if (require.main === module) {
  main().catch(console.error);
}
