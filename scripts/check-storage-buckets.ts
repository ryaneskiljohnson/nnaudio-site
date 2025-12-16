import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Available buckets:');
  data?.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
  });
}

checkBuckets().catch(console.error);
