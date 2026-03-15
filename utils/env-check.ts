/**
 * Environment variables checker for debugging deployment issues
 */

export const checkEnvironmentVariables = () => {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    return false;
  }

  console.log('All required environment variables are set');
  return true;
};

export const logEnvironmentStatus = () => {
  const isServer = typeof window === 'undefined';
  console.log('Environment check:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL ? 'SET' : 'MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  // Server-only variables - will show MISSING on client (this is expected)
  if (isServer) {
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
  console.log('- SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'MISSING');
  console.log('- SENDER_EMAIL:', process.env.SENDER_EMAIL ? 'SET' : 'MISSING (optional)');
  console.log('- SENDER_NAME:', process.env.SENDER_NAME ? 'SET' : 'MISSING (optional)');
  console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'MISSING');
  console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING');
  console.log('- AWS_REGION:', process.env.AWS_REGION ? 'SET' : 'MISSING');
  } else {
    console.log('- SUPABASE_SERVICE_ROLE_KEY: N/A (server-only)');
    console.log('- STRIPE_SECRET_KEY: N/A (server-only)');
    console.log('- AWS_ACCESS_KEY_ID: N/A (server-only)');
    console.log('- AWS_SECRET_ACCESS_KEY: N/A (server-only)');
    console.log('- AWS_REGION: N/A (server-only)');
    console.log('- SENDGRID_API_KEY: N/A (server-only)');
    console.log('- SENDER_EMAIL: N/A (server-only)');
    console.log('- SENDER_NAME: N/A (server-only)');
  }
  console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'SET' : 'MISSING');
};

/** Email-only env check for comparing local vs Vercel. See docs/VERCEL_EMAIL_ENV.md */
export const logEmailEnvStatus = () => {
  const vars: [string, string][] = [
    ['SENDGRID_API_KEY', 'required'],
    ['SENDER_EMAIL', 'optional'],
    ['SENDER_NAME', 'optional'],
    ['NEXT_PUBLIC_SITE_URL', 'recommended'],
  ];
  console.log('Email env (for Vercel parity):');
  for (const [name, kind] of vars) {
    const set = !!process.env[name];
    console.log(`  ${name}: ${set ? 'SET' : 'MISSING'} (${kind})`);
  }
};
