import { createAdminClient } from '@/utils/supabase/service';

async function checkBundles() {
  const supabase = await createAdminClient();

  const { data: bundles, error } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      status,
      bundle_products(count)
    `)
    .eq('status', 'active');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Active Bundles:');
  bundles?.forEach(b => {
    const count = (b.bundle_products as any)?.length || 0;
    console.log(`- ${b.name}: ${count} products`);
  });
}

checkBundles().catch(console.error);
