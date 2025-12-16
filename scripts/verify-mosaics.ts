import { createAdminClient } from '@/utils/supabase/service';

async function verifyMosaics() {
  const supabase = await createAdminClient();

  const { data: bundles, error } = await supabase
    .from('bundles')
    .select('id, name, slug, mosaic_image_url')
    .eq('status', 'active');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Bundle Mosaic URLs:');
  bundles?.forEach(b => {
    if (b.mosaic_image_url) {
      console.log(`  ✅ ${b.name}: ${b.mosaic_image_url}`);
    } else {
      console.log(`  ❌ ${b.name}: No mosaic URL`);
    }
  });
}

verifyMosaics().catch(console.error);
