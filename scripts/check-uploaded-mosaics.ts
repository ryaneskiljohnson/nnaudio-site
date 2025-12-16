import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMosaics() {
  const { data, error } = await supabase.storage
    .from('product-images')
    .list('bundle-mosaics', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Uploaded mosaic images:');
  data?.forEach(file => {
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(`bundle-mosaics/${file.name}`);
    console.log(`  - ${file.name}: ${publicUrl}`);
  });
}

checkMosaics().catch(console.error);
