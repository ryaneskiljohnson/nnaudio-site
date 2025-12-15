/**
 * Test script for iOS validation endpoints
 * Tests both validate-transaction and validate-receipt endpoints locally
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing iOS Validation Endpoints Locally\n');
console.log(`Base URL: ${BASE_URL}\n`);

// Check environment variables
console.log('📋 Checking Environment Variables:\n');
const requiredVars = {
  'APPLE_APP_STORE_KEY_ID': process.env.APPLE_APP_STORE_KEY_ID,
  'APPLE_APP_STORE_ISSUER_ID': process.env.APPLE_APP_STORE_ISSUER_ID,
  'APPLE_APP_STORE_PRIVATE_KEY': process.env.APPLE_APP_STORE_PRIVATE_KEY ? 'Set (length: ' + process.env.APPLE_APP_STORE_PRIVATE_KEY.length + ')' : 'Missing',
  'APPLE_APP_STORE_BUNDLE_ID': process.env.APPLE_APP_STORE_BUNDLE_ID || 'com.NNAudio.Cymasphere (default)',
  'APPLE_SHARED_SECRET': process.env.APPLE_SHARED_SECRET ? 'Set' : 'Missing',
};

Object.entries(requiredVars).forEach(([key, value]) => {
  const status = value && value !== 'Missing' ? '✅' : '❌';
  console.log(`  ${status} ${key}: ${value}`);
});

console.log('\n');

// Get a test access token (you'll need to provide this or we can skip auth)
async function getTestAccessToken() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('⚠️  Supabase credentials not found - tests will use dummy token\n');
    return 'dummy-token-for-testing';
  }
  
  // For testing, we'll use a dummy token
  // In real testing, you'd need to authenticate first
  return 'dummy-token-for-testing';
}

async function testTransactionValidation() {
  console.log('🔍 Testing /api/ios/validate-transaction endpoint...\n');
  
  const accessToken = await getTestAccessToken();
  
  // Test with a dummy transaction ID (will likely return 404, but should not return 401 if auth is working)
  const testTransactionId = '2000000000000000'; // Dummy transaction ID
  
  try {
    const response = await fetch(`${BASE_URL}/api/ios/validate-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transactionId: testTransactionId,
        accessToken: accessToken,
      }),
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('\n❌ 401 Unauthorized - Authentication failed');
      console.log('   This means the App Store Server API credentials are incorrect or missing permissions');
    } else if (response.status === 404) {
      console.log('\n✅ 404 Not Found - Authentication is working!');
      console.log('   The transaction ID doesn\'t exist, but auth succeeded');
    } else if (response.status === 400) {
      console.log('\n⚠️  400 Bad Request - Check the error details above');
    } else {
      console.log(`\n⚠️  Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing transaction validation:', error.message);
  }
}

async function testReceiptValidation() {
  console.log('\n\n🔍 Testing /api/ios/validate-receipt endpoint...\n');
  
  const accessToken = await getTestAccessToken();
  
  // Test with a dummy receipt (base64 encoded dummy data)
  // This will fail, but we can see what error we get
  const dummyReceipt = Buffer.from('dummy-receipt-data-for-testing').toString('base64');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ios/validate-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        receiptData: dummyReceipt,
        accessToken: accessToken,
      }),
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('\n❌ 401 Unauthorized - Authentication failed');
    } else if (response.status === 400 || response.status === 200) {
      console.log('\n✅ Endpoint is accessible');
      console.log('   (Receipt validation will fail with dummy data, but endpoint is working)');
    }
  } catch (error) {
    console.error('❌ Error testing receipt validation:', error.message);
  }
}

async function runTests() {
  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    if (!healthCheck) {
      console.log('⚠️  Could not reach server. Make sure Next.js dev server is running:');
      console.log('   npm run dev\n');
      return;
    }
  } catch (error) {
    console.log('⚠️  Could not reach server. Make sure Next.js dev server is running:');
    console.log('   npm run dev\n');
    return;
  }
  
  await testTransactionValidation();
  await testReceiptValidation();
  
  console.log('\n\n✅ Tests completed!');
  console.log('\nNote: For real testing, use actual transaction IDs and receipt data from your iOS app.');
}

runTests().catch(console.error);

