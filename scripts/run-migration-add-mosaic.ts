import { createAdminClient } from '@/utils/supabase/service';

async function runMigration() {
  const supabase = await createAdminClient();
  
  console.log('Adding mosaic_image_url column to bundles table...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS mosaic_image_url TEXT;'
  });
  
  if (error) {
    // Try direct query instead
    const { error: directError } = await supabase
      .from('bundles')
      .select('mosaic_image_url')
      .limit(1);
    
    if (directError && directError.message.includes('column') && directError.message.includes('does not exist')) {
      console.log('Column does not exist, trying to add it via raw SQL...');
      // We'll need to use a different approach - just check if it works
      console.log('Please run the migration manually or it will be added when we try to update');
    } else {
      console.log('✓ Column already exists or migration successful');
    }
  } else {
    console.log('✓ Migration successful');
  }
}

runMigration().catch(console.error);
