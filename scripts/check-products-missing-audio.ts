import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

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

async function checkProductsMissingAudio() {
  console.log('=== Checking Products Without Audio ===\n');

  // Fetch all active products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples, category')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products found.');
    return;
  }

  const productsWithoutAudio = products.filter(p => 
    !p.audio_samples || 
    !Array.isArray(p.audio_samples) || 
    p.audio_samples.length === 0
  );

  console.log(`Total products: ${products.length}`);
  console.log(`Products without audio: ${productsWithoutAudio.length}\n`);

  if (productsWithoutAudio.length > 0) {
    console.log('Products that might need audio files:\n');
    
    // Group by category/type to see patterns
    const byCategory: Record<string, any[]> = {};
    
    productsWithoutAudio.forEach(product => {
      const category = product.category || 'uncategorized';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(product);
    });

    Object.keys(byCategory).sort().forEach(category => {
      const products = byCategory[category];
      console.log(`${category} (${products.length}):`);
      products.forEach(p => {
        console.log(`  - ${p.name} (${p.slug})`);
      });
      console.log('');
    });

    console.log('\nNote: Some products (like bundles, free items, or legacy products) may not have audio samples.');
    console.log('If you want to check specific products for audio, run the scraper on them individually.');
  } else {
    console.log('✅ All products have audio samples!');
  }
}

checkProductsMissingAudio().catch(console.error);

