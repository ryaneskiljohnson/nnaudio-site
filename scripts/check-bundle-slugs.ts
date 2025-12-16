import { createAdminClient } from '@/utils/supabase/service';

async function checkBundleSlugs() {
  const supabase = await createAdminClient();

  const { data: bundles } = await supabase
    .from('bundles')
    .select('id, name, slug')
    .in('name', ['Ultimate Bundle', "Producer's Arsenal", 'Beat Lab']);

  console.log('Elite Bundle Slugs:');
  bundles?.forEach(b => {
    console.log(`  ${b.name}: ${b.slug}`);
  });
}

checkBundleSlugs().catch(console.error);
