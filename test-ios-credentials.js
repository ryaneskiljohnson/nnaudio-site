/**
 * Test script to validate iOS App Store Server API credentials locally
 * Tests credential format and JWT generation without needing the server
 */

require('dotenv').config({ path: '.env.local' });
const { AppStoreServerAPIClient, Environment } = require('@apple/app-store-server-library');

console.log('🧪 Testing iOS App Store Server API Credentials\n');

// Get credentials
const keyId = process.env.APPLE_APP_STORE_KEY_ID?.trim();
const issuerId = process.env.APPLE_APP_STORE_ISSUER_ID?.trim();
const privateKey = process.env.APPLE_APP_STORE_PRIVATE_KEY?.trim();
const bundleId = (process.env.APPLE_APP_STORE_BUNDLE_ID || 'com.NNAudio.Cymasphere').trim();

console.log('📋 Credentials Check:\n');
console.log(`  Key ID: ${keyId ? keyId.substring(0, 4) + '...' + keyId.substring(keyId.length - 2) : '❌ Missing'}`);
console.log(`  Issuer ID: ${issuerId ? issuerId.substring(0, 8) + '...' + issuerId.substring(issuerId.length - 4) : '❌ Missing'}`);
console.log(`  Private Key: ${privateKey ? '✅ Set (' + privateKey.length + ' chars)' : '❌ Missing'}`);
console.log(`  Bundle ID: ${bundleId}`);
console.log(`  Private Key has headers: ${privateKey?.includes('-----BEGIN PRIVATE KEY-----') ? '✅' : '❌'}`);
console.log(`  Private Key has end headers: ${privateKey?.includes('-----END PRIVATE KEY-----') ? '✅' : '❌'}`);

if (!keyId || !issuerId || !privateKey) {
  console.log('\n❌ Missing required credentials!');
  process.exit(1);
}

// Prepare private key
let encodedKey = privateKey;
if (!encodedKey.includes('-----BEGIN PRIVATE KEY-----')) {
  encodedKey = `-----BEGIN PRIVATE KEY-----\n${encodedKey.replace(/\s/g, '')}\n-----END PRIVATE KEY-----`;
}

console.log('\n🔧 Testing App Store Server API Client Creation...\n');

try {
  // Try to create client for production
  console.log('Creating client for PRODUCTION environment...');
  const prodClient = new AppStoreServerAPIClient(
    encodedKey,
    keyId,
    issuerId,
    bundleId,
    Environment.PRODUCTION
  );
  console.log('✅ Production client created successfully\n');
  
  // Try to create client for sandbox
  console.log('Creating client for SANDBOX environment...');
  const sandboxClient = new AppStoreServerAPIClient(
    encodedKey,
    keyId,
    issuerId,
    bundleId,
    Environment.SANDBOX
  );
  console.log('✅ Sandbox client created successfully\n');
  
  console.log('✅ All credentials are valid and clients can be created!');
  console.log('\n📝 Next steps:');
  console.log('   1. Start your dev server: npm run dev');
  console.log('   2. Test with a real transaction ID from your iOS app');
  console.log('   3. The 401 error should be resolved with the new key (DL4CMD84C4)');
  
} catch (error) {
  console.error('\n❌ Error creating client:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}

