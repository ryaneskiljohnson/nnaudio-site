const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jibirpbauzqhdiwjlrmf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addAdmin() {
  try {
    // First check if admin already exists
    const { data: existing, error: checkError } = await supabase
      .from('admins')
      .select('*')
      .eq('user', '900f11b8-c901-49fd-bfab-5fafe984ce72');
    
    if (checkError) {
      console.error('Error checking existing admin:', checkError);
      return;
    }
    
    if (existing && existing.length > 0) {
      console.log('User is already an admin:', existing[0]);
      return;
    }
    
    // Add user as admin
    const { data, error } = await supabase
      .from('admins')
      .insert([
        { user: '900f11b8-c901-49fd-bfab-5fafe984ce72' }
      ]);
    
    if (error) {
      console.error('Error adding admin:', error);
    } else {
      console.log('Successfully added admin:', data);
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

addAdmin(); 