import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function activateTetradProducts() {
  console.log('=== Activating Tetrad Products ===\n');

  const supabase = await createAdminClient();

  // Get the 3 individual Tetrad products
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, slug, status')
    .in('slug', ['tetrad-keys', 'tetrad-guitars', 'tetrad-winds']);

  if (fetchError || !products || products.length === 0) {
    console.error('❌ Error fetching products:', fetchError);
    return;
  }

  console.log(`Found ${products.length} Tetrad products to activate:\n`);

  for (const product of products) {
    console.log(`Activating ${product.name} (${product.slug})...`);
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ status: 'active' })
      .eq('id', product.id);

    if (updateError) {
      console.error(`  ❌ Error activating ${product.name}:`, updateError);
    } else {
      console.log(`  ✅ Activated ${product.name}`);
    }
  }

  console.log('\n✅ All Tetrad products activated!');
}

activateTetradProducts().catch(console.error);

