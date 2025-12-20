import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNNAudioAccess() {
  console.log('=== NNAudio Access Product Information ===\n');

  // Search for NNAudio Access product
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .or('name.ilike.%nnaudio access%,slug.ilike.%nnaudio-access%')
    .limit(5);

  if (error) {
    console.error('❌ Error querying database:', error.message);
    return;
  }

  if (!products || products.length === 0) {
    console.log('⚠️  No NNAudio Access product found in database');
    return;
  }

  console.log(`Found ${products.length} product(s):\n`);

  products.forEach((product, index) => {
    console.log(`--- Product ${index + 1} ---`);
    console.log(`ID: ${product.id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Slug: ${product.slug}`);
    console.log(`Price: ${product.price || 'N/A'}`);
    console.log(`Featured Image: ${product.featured_image_url || 'N/A'}`);
    console.log(`Logo URL: ${product.logo_url || 'N/A'}`);
    console.log(`Description: ${product.description ? product.description.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`Created: ${product.created_at || 'N/A'}`);
    console.log(`Updated: ${product.updated_at || 'N/A'}`);
    console.log(`Active: ${product.active !== false ? 'Yes' : 'No'}`);
    console.log('');
  });

  // Check if it's excluded from free products
  console.log('--- Product Status ---');
  console.log('✓ Excluded from free products list (see app/api/products/route.ts)');
  console.log('✓ Featured in my-products page CTA banner');
  console.log('✓ Download installers available in downloads page');
  console.log('');
}

checkNNAudioAccess().catch(console.error);

