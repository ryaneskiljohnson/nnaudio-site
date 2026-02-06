const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jibirpbauzqhdiwjlrmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

async function createUser(email = 'example@example.com', password = 'TempPassword123!', name = 'Example User') {
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log(`Creating user ${email}...`);
    
    // Create user using admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        name: name
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    console.log('✅ User created successfully!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Created at:', data.user.created_at);
    console.log('Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    
    return data.user;
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return null;
  }
}

// If running directly (not imported), create the example user
if (require.main === module) {
  // You can customize these values or pass them as command line arguments
  const email = process.argv[2] || 'example@example.com';
  const password = process.argv[3] || 'TempPassword123!';
  const name = process.argv[4] || 'Example User';
  
  createUser(email, password, name);
}

module.exports = { createUser }; 