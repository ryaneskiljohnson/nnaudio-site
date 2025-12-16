import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEliteBundleUniqueness() {
  console.log('=== Fixing Elite Bundle Product Uniqueness ===\n');

  // Get all elite bundles (bundles with subscription tiers)
  const { data: eliteBundles, error: bundlesError } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      slug,
      bundle_subscription_tiers!inner(id)
    `)
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (bundlesError) {
    console.error('Error fetching elite bundles:', bundlesError);
    return;
  }

  if (!eliteBundles || eliteBundles.length === 0) {
    console.log('No elite bundles found');
    return;
  }

  console.log(`Found ${eliteBundles.length} elite bundle(s):\n`);
  eliteBundles.forEach(bundle => {
    console.log(`  - ${bundle.name} (${bundle.slug})`);
  });
  console.log('\n');

  // Strategy: 
  // 1. Ultimate Bundle keeps all its products (it's the "ultimate" bundle)
  // 2. Producer's Arsenal keeps only products NOT in Ultimate Bundle
  // 3. Beat Lab keeps only products NOT in Ultimate Bundle or Producer's Arsenal

  const ultimateBundle = eliteBundles.find(b => 
    b.name.toLowerCase().includes('ultimate')
  );
  const producersArsenal = eliteBundles.find(b => 
    b.name.toLowerCase().includes("producer's") || b.name.toLowerCase().includes('producers')
  );
  const beatLab = eliteBundles.find(b => 
    b.name.toLowerCase().includes('beat lab')
  );

  if (!ultimateBundle || !producersArsenal || !beatLab) {
    console.error('Could not find all three elite bundles');
    return;
  }

  console.log('Processing order:');
  console.log(`  1. ${ultimateBundle.name} - keeps all products`);
  console.log(`  2. ${producersArsenal.name} - removes products from Ultimate Bundle`);
  console.log(`  3. ${beatLab.name} - removes products from Ultimate Bundle and Producer's Arsenal\n`);

  // Get all products in Ultimate Bundle
  const { data: ultimateProducts, error: ultimateError } = await supabase
    .from('bundle_products')
    .select('product_id')
    .eq('bundle_id', ultimateBundle.id);

  if (ultimateError) {
    console.error('Error fetching Ultimate Bundle products:', ultimateError);
    return;
  }

  const ultimateProductIds = new Set(
    (ultimateProducts || []).map((bp: any) => bp.product_id)
  );

  console.log(`Ultimate Bundle has ${ultimateProductIds.size} products\n`);

  // Fix Producer's Arsenal - remove products that are in Ultimate Bundle
  const { data: producersProducts, error: producersError } = await supabase
    .from('bundle_products')
    .select('id, product_id, product:products!inner(id, name)')
    .eq('bundle_id', producersArsenal.id);

  if (producersError) {
    console.error('Error fetching Producer\'s Arsenal products:', producersError);
    return;
  }

  const producersProductsToRemove = (producersProducts || []).filter((bp: any) =>
    ultimateProductIds.has(bp.product_id)
  );

  if (producersProductsToRemove.length > 0) {
    console.log(`Removing ${producersProductsToRemove.length} products from ${producersArsenal.name} that are in Ultimate Bundle:`);
    producersProductsToRemove.forEach((bp: any) => {
      console.log(`  - ${bp.product?.name || bp.product_id}`);
    });

    const idsToRemove = producersProductsToRemove.map((bp: any) => bp.id);
    const { error: removeError } = await supabase
      .from('bundle_products')
      .delete()
      .in('id', idsToRemove);

    if (removeError) {
      console.error('Error removing products:', removeError);
      return;
    }

    console.log(`✅ Removed ${producersProductsToRemove.length} products from ${producersArsenal.name}\n`);
  } else {
    console.log(`✅ ${producersArsenal.name} already has no duplicates with Ultimate Bundle\n`);
  }

  // Fix Beat Lab - remove products that are in Ultimate Bundle or Producer's Arsenal
  const { data: beatLabProducts, error: beatLabError } = await supabase
    .from('bundle_products')
    .select('id, product_id, product:products!inner(id, name)')
    .eq('bundle_id', beatLab.id);

  if (beatLabError) {
    console.error('Error fetching Beat Lab products:', beatLabError);
    return;
  }

  // Get Producer's Arsenal products after cleanup
  const { data: producersProductsAfter, error: producersAfterError } = await supabase
    .from('bundle_products')
    .select('product_id')
    .eq('bundle_id', producersArsenal.id);

  if (producersAfterError) {
    console.error('Error fetching Producer\'s Arsenal products after cleanup:', producersAfterError);
    return;
  }

  const producersProductIds = new Set(
    (producersProductsAfter || []).map((bp: any) => bp.product_id)
  );

  const beatLabProductsToRemove = (beatLabProducts || []).filter((bp: any) =>
    ultimateProductIds.has(bp.product_id) || producersProductIds.has(bp.product_id)
  );

  if (beatLabProductsToRemove.length > 0) {
    console.log(`Removing ${beatLabProductsToRemove.length} products from ${beatLab.name} that are in Ultimate Bundle or Producer's Arsenal:`);
    beatLabProductsToRemove.forEach((bp: any) => {
      const inUltimate = ultimateProductIds.has(bp.product_id);
      const inProducers = producersProductIds.has(bp.product_id);
      const location = [];
      if (inUltimate) location.push('Ultimate Bundle');
      if (inProducers) location.push("Producer's Arsenal");
      console.log(`  - ${bp.product?.name || bp.product_id} (in ${location.join(' and ')})`);
    });

    const idsToRemove = beatLabProductsToRemove.map((bp: any) => bp.id);
    const { error: removeError } = await supabase
      .from('bundle_products')
      .delete()
      .in('id', idsToRemove);

    if (removeError) {
      console.error('Error removing products:', removeError);
      return;
    }

    console.log(`✅ Removed ${beatLabProductsToRemove.length} products from ${beatLab.name}\n`);
  } else {
    console.log(`✅ ${beatLab.name} already has no duplicates with other elite bundles\n`);
  }

  // Verify the fix
  console.log('=== Verification ===\n');
  
  const { data: finalUltimate, error: finalUltimateError } = await supabase
    .from('bundle_products')
    .select('product_id')
    .eq('bundle_id', ultimateBundle.id);

  const { data: finalProducers, error: finalProducersError } = await supabase
    .from('bundle_products')
    .select('product_id')
    .eq('bundle_id', producersArsenal.id);

  const { data: finalBeatLab, error: finalBeatLabError } = await supabase
    .from('bundle_products')
    .select('product_id')
    .eq('bundle_id', beatLab.id);

  if (finalUltimateError || finalProducersError || finalBeatLabError) {
    console.error('Error verifying results');
    return;
  }

  const finalUltimateIds = new Set((finalUltimate || []).map((bp: any) => bp.product_id));
  const finalProducersIds = new Set((finalProducers || []).map((bp: any) => bp.product_id));
  const finalBeatLabIds = new Set((finalBeatLab || []).map((bp: any) => bp.product_id));

  // Check for remaining duplicates
  const ultimateProducersOverlap = [...finalUltimateIds].filter(id => finalProducersIds.has(id));
  const ultimateBeatLabOverlap = [...finalUltimateIds].filter(id => finalBeatLabIds.has(id));
  const producersBeatLabOverlap = [...finalProducersIds].filter(id => finalBeatLabIds.has(id));

  console.log(`Final product counts:`);
  console.log(`  ${ultimateBundle.name}: ${finalUltimateIds.size} products`);
  console.log(`  ${producersArsenal.name}: ${finalProducersIds.size} products`);
  console.log(`  ${beatLab.name}: ${finalBeatLabIds.size} products\n`);

  if (ultimateProducersOverlap.length > 0) {
    console.log(`⚠️  Still ${ultimateProducersOverlap.length} products shared between Ultimate Bundle and Producer's Arsenal`);
  }
  if (ultimateBeatLabOverlap.length > 0) {
    console.log(`⚠️  Still ${ultimateBeatLabOverlap.length} products shared between Ultimate Bundle and Beat Lab`);
  }
  if (producersBeatLabOverlap.length > 0) {
    console.log(`⚠️  Still ${producersBeatLabOverlap.length} products shared between Producer's Arsenal and Beat Lab`);
  }

  if (ultimateProducersOverlap.length === 0 && ultimateBeatLabOverlap.length === 0 && producersBeatLabOverlap.length === 0) {
    console.log('✅ All elite bundles now have unique products!\n');
  }
}

fixEliteBundleUniqueness()
  .then(() => {
    console.log('✅ Fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
