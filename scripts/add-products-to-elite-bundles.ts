import { createAdminClient } from '@/utils/supabase/service';

async function addProductsToEliteBundles() {
  const supabase = await createAdminClient();

  // Get elite bundles
  const { data: bundles } = await supabase
    .from('bundles')
    .select('id, name, bundle_subscription_tiers(id)');

  const eliteBundles = bundles?.filter(b => (b.bundle_subscription_tiers as any[])?.length > 0) || [];
  
  const producersArsenal = eliteBundles.find(b => 
    b.name.toLowerCase().includes("producer's") || b.name.toLowerCase().includes('producers')
  );
  const beatLab = eliteBundles.find(b => 
    b.name.toLowerCase().includes('beat lab')
  );

  if (!producersArsenal || !beatLab) {
    console.log('Could not find elite bundles');
    return;
  }

  // Add plugins to Producer's Arsenal
  const { data: plugins } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('category', 'plugin')
    .eq('status', 'active');

  if (plugins && plugins.length > 0) {
    // Check existing
    const { data: existing } = await supabase
      .from('bundle_products')
      .select('product_id')
      .eq('bundle_id', producersArsenal.id);

    const existingIds = new Set((existing || []).map(e => e.product_id));
    const toAdd = plugins
      .filter(p => !existingIds.has(p.id))
      .map((p, idx) => ({
        bundle_id: producersArsenal.id,
        product_id: p.id,
        display_order: idx
      }));

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('bundle_products')
        .insert(toAdd);
      
      if (error) {
        console.error('Error adding plugins to Producer\'s Arsenal:', error);
      } else {
        console.log(`✓ Added ${toAdd.length} plugins to Producer's Arsenal`);
      }
    } else {
      console.log('Producer\'s Arsenal already has all plugins');
    }
  }

  // Add packs to Beat Lab
  const { data: packs } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('category', 'pack')
    .eq('status', 'active');

  if (packs && packs.length > 0) {
    // Check existing
    const { data: existing } = await supabase
      .from('bundle_products')
      .select('product_id')
      .eq('bundle_id', beatLab.id);

    const existingIds = new Set((existing || []).map(e => e.product_id));
    const toAdd = packs
      .filter(p => !existingIds.has(p.id))
      .map((p, idx) => ({
        bundle_id: beatLab.id,
        product_id: p.id,
        display_order: idx
      }));

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('bundle_products')
        .insert(toAdd);
      
      if (error) {
        console.error('Error adding packs to Beat Lab:', error);
      } else {
        console.log(`✓ Added ${toAdd.length} packs to Beat Lab`);
      }
    } else {
      console.log('Beat Lab already has all packs');
    }
  }
}

addProductsToEliteBundles().catch(console.error);
