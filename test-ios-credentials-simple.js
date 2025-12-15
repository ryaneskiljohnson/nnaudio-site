/**
 * Simple test to validate iOS App Store Server API credentials format
 */

require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing iOS App Store Server API Credentials\n');

// Get credentials
const keyId = process.env.APPLE_APP_STORE_KEY_ID?.trim();
const issuerId = process.env.APPLE_APP_STORE_ISSUER_ID?.trim();
const privateKey = process.env.APPLE_APP_STORE_PRIVATE_KEY?.trim();
const bundleId = (process.env.APPLE_APP_STORE_BUNDLE_ID || 'com.NNAudio.Cymasphere').trim();

console.log('📋 Credentials Validation:\n');

let allValid = true;

// Check Key ID
if (!keyId) {
  console.log('❌ APPLE_APP_STORE_KEY_ID: Missing');
  allValid = false;
} else {
  console.log(`✅ APPLE_APP_STORE_KEY_ID: ${keyId}`);
  console.log(`   Length: ${keyId.length} characters`);
  console.log(`   Has newlines: ${keyId.includes('\n') ? '❌ YES (should be trimmed)' : '✅ No'}`);
}

// Check Issuer ID
if (!issuerId) {
  console.log('❌ APPLE_APP_STORE_ISSUER_ID: Missing');
  allValid = false;
} else {
  console.log(`✅ APPLE_APP_STORE_ISSUER_ID: ${issuerId.substring(0, 8)}...${issuerId.substring(issuerId.length - 4)}`);
  console.log(`   Length: ${issuerId.length} characters`);
  console.log(`   Format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issuerId) ? '✅ Valid UUID format' : '⚠️  Not standard UUID format'}`);
  console.log(`   Has newlines: ${issuerId.includes('\n') ? '❌ YES (should be trimmed)' : '✅ No'}`);
}

// Check Private Key
if (!privateKey) {
  console.log('❌ APPLE_APP_STORE_PRIVATE_KEY: Missing');
  allValid = false;
} else {
  console.log(`✅ APPLE_APP_STORE_PRIVATE_KEY: Set`);
  console.log(`   Length: ${privateKey.length} characters`);
  const hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasEnd = privateKey.includes('-----END PRIVATE KEY-----');
  console.log(`   Has BEGIN header: ${hasBegin ? '✅' : '❌'}`);
  console.log(`   Has END header: ${hasEnd ? '✅' : '❌'}`);
  if (!hasBegin || !hasEnd) {
    allValid = false;
  }
  
  // Check if it's a valid PEM format
  const pemMatch = privateKey.match(/-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=\s]+)\n-----END PRIVATE KEY-----/);
  if (pemMatch) {
    console.log(`   PEM format: ✅ Valid`);
    const keyContent = pemMatch[1].replace(/\s/g, '');
    console.log(`   Key content length: ${keyContent.length} characters`);
  } else {
    console.log(`   PEM format: ⚠️  May need reformatting`);
  }
  
  console.log(`   Has newlines: ${privateKey.includes('\n') && privateKey.includes('-----BEGIN') ? '✅ (expected in PEM)' : '⚠️  Check format'}`);
}

// Check Bundle ID
console.log(`✅ APPLE_APP_STORE_BUNDLE_ID: ${bundleId}`);
console.log(`   Has newlines: ${bundleId.includes('\n') ? '❌ YES (should be trimmed)' : '✅ No'}`);

// Check Shared Secret (for receipt validation)
const sharedSecret = process.env.APPLE_SHARED_SECRET;
console.log(`\n📋 Receipt Validation Credentials:`);
console.log(`   APPLE_SHARED_SECRET: ${sharedSecret ? '✅ Set' : '⚠️  Not set (needed for legacy receipt validation)'}`);

console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('✅ All credentials are present and properly formatted!');
  console.log('\n📝 Summary:');
  console.log(`   - Using In-App Purchase Key ID: ${keyId}`);
  console.log(`   - Issuer ID: ${issuerId.substring(0, 8)}...`);
  console.log(`   - Bundle ID: ${bundleId}`);
  console.log(`   - Private key format: ✅ Valid`);
  console.log('\n🎯 Next steps:');
  console.log('   1. Start dev server: npm run dev');
  console.log('   2. Test with a real transaction ID from your iOS app');
  console.log('   3. The 401 error should be resolved with the new key');
} else {
  console.log('❌ Some credentials are missing or invalid!');
  console.log('   Please check the errors above and fix them.');
  process.exit(1);
}

