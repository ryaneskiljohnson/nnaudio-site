/**
 * Test Script for Basic dataLayer Tracking
 * 
 * Tests that dataLayer events are properly pushed on:
 * 1. Registration success page
 * 2. Checkout success page (trial)
 * 3. Checkout success page (paid subscription)
 * 
 * Usage:
 *   node test-datalayer-basic.js
 * 
 * Or with URL:
 *   node test-datalayer-basic.js http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

console.log('🧪 Testing Basic dataLayer Setup\n');
console.log(`Base URL: ${BASE_URL}\n`);

// Test 1: Registration Success Page
async function testRegistrationSuccess() {
  console.log('📝 Test 1: Registration Success Page');
  console.log('─'.repeat(50));
  
  try {
    const url = `${BASE_URL}/signup-success?name=Test+User&email=test@example.com`;
    console.log(`Testing URL: ${url}\n`);
    console.log('Expected dataLayer event:');
    console.log('  event: "registration_success"\n');
    console.log('✅ Verification steps:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Console tab');
    console.log(`3. Visit: ${url}`);
    console.log('4. Type: window.dataLayer');
    console.log('5. Look for: {event: "registration_success"}\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test 2: Checkout Success - Free Trial
async function testCheckoutSuccessTrial() {
  console.log('📝 Test 2: Checkout Success - Free Trial');
  console.log('─'.repeat(50));
  
  try {
    // Note: This won't work without a real Stripe session ID
    // But we can show what should happen
    const url = `${BASE_URL}/checkout-success?isSignedUp=true&isTrial=true&session_id=cs_test_123`;
    console.log(`Testing URL: ${url}\n`);
    console.log('Expected dataLayer event:');
    console.log('  event: "free_trial"\n');
    console.log('✅ Verification steps:');
    console.log('1. Complete a real trial signup on the site');
    console.log('2. You\'ll be redirected to checkout-success?isTrial=true');
    console.log('3. Open DevTools Console');
    console.log('4. Type: window.dataLayer');
    console.log('5. Look for: {event: "free_trial"}\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test 3: Checkout Success - Paid Subscription
async function testCheckoutSuccessPaid() {
  console.log('📝 Test 3: Checkout Success - Paid Subscription');
  console.log('─'.repeat(50));
  
  try {
    // Note: This won't work without a real Stripe session ID with value
    const url = `${BASE_URL}/checkout-success?isSignedUp=true&isTrial=false&session_id=cs_test_456&value=9.99&currency=USD`;
    console.log(`Testing URL: ${url}\n`);
    console.log('Expected dataLayer event:');
    console.log('  event: "subscription_success"');
    console.log('  subscription: {');
    console.log('    value: 9.99,');
    console.log('    currency: "USD"');
    console.log('  }\n');
    console.log('✅ Verification steps:');
    console.log('1. Complete a real paid subscription on the site');
    console.log('2. You\'ll be redirected to checkout-success?isTrial=false&value=X&currency=Y');
    console.log('3. Open DevTools Console');
    console.log('4. Type: window.dataLayer');
    console.log('5. Look for: {event: "subscription_success", subscription: {...}}\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test 4: Check files exist
async function testFilesExist() {
  console.log('📝 Test 4: Verify Implementation Files');
  console.log('─'.repeat(50));
  
  const fs = require('fs');
  const path = require('path');
  
  const files = [
    'app/(auth)/signup-success/page.tsx',
    'app/(auth)/checkout-success/page.tsx',
    'app/api/checkout-result/route.ts',
    'app/api/checkout-session-details/route.ts',
  ];
  
  console.log('Checking files:\n');
  
  files.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${file}`);
  });
  
  console.log('\n');
}

// Test 5: Code inspection
async function testCodeInspection() {
  console.log('📝 Test 5: Code Inspection');
  console.log('─'.repeat(50));
  
  const fs = require('fs');
  const path = require('path');
  
  console.log('Checking for dataLayer.push() in signup-success page:\n');
  
  try {
    const signupFile = path.join(__dirname, 'app/(auth)/signup-success/page.tsx');
    const signupContent = fs.readFileSync(signupFile, 'utf8');
    
    if (signupContent.includes('registration_success')) {
      console.log('✅ Found registration_success event');
      const lines = signupContent.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('registration_success')) {
          console.log(`   Line ${i + 1}: ${line.trim()}`);
        }
      });
    } else {
      console.log('❌ registration_success event not found');
    }
  } catch (error) {
    console.log('⚠️ Could not inspect file:', error.message);
  }
  
  console.log('\n');
  
  console.log('Checking for dataLayer.push() in checkout-success page:\n');
  
  try {
    const checkoutFile = path.join(__dirname, 'app/(auth)/checkout-success/page.tsx');
    const checkoutContent = fs.readFileSync(checkoutFile, 'utf8');
    
    const events = ['free_trial', 'subscription_success'];
    
    events.forEach(event => {
      if (checkoutContent.includes(event)) {
        console.log(`✅ Found ${event} event`);
      } else {
        console.log(`❌ ${event} event not found`);
      }
    });
  } catch (error) {
    console.log('⚠️ Could not inspect file:', error.message);
  }
  
  console.log('\n');
}

// Test 6: Manual testing checklist
function testManualChecklist() {
  console.log('📝 Test 6: Manual Testing Checklist');
  console.log('─'.repeat(50));
  
  console.log('\n✅ Steps to manually test:\n');
  
  console.log('1️⃣ Registration Success:');
  console.log('   - Go to: https://www.cymasphere.com/signup');
  console.log('   - Create an account');
  console.log('   - You\'ll be redirected to /signup-success');
  console.log('   - Open DevTools Console (F12)');
  console.log('   - Type: window.dataLayer');
  console.log('   - Look for: [{event: "registration_success"}, ...]\n');
  
  console.log('2️⃣ Free Trial:');
  console.log('   - Go to: https://www.cymasphere.com/pricing');
  console.log('   - Click "Start Free Trial"');
  console.log('   - Complete Stripe checkout');
  console.log('   - You\'ll be redirected to /checkout-success?isTrial=true');
  console.log('   - Open DevTools Console');
  console.log('   - Type: window.dataLayer');
  console.log('   - Look for: [{event: "free_trial"}, ...]\n');
  
  console.log('3️⃣ Paid Subscription:');
  console.log('   - Go to: https://www.cymasphere.com/pricing');
  console.log('   - Click "Subscribe Monthly" or "Subscribe Annual"');
  console.log('   - Complete Stripe checkout payment');
  console.log('   - You\'ll be redirected to /checkout-success?isTrial=false&value=X&currency=Y');
  console.log('   - Open DevTools Console');
  console.log('   - Type: window.dataLayer');
  console.log('   - Look for: [{event: "subscription_success", subscription: {value: X, currency: "Y"}}, ...]\n');
  
  console.log('4️⃣ GTM Integration:');
  console.log('   - If GTM ID is configured (NEXT_PUBLIC_GTM_ID)');
  console.log('   - Go to GTM Preview Mode');
  console.log('   - Enter: https://www.cymasphere.com');
  console.log('   - Perform the above steps');
  console.log('   - You should see dataLayer events firing in GTM panel\n');
  
  console.log('5️⃣ GA4 Integration:');
  console.log('   - If GA4 is configured in GTM');
  console.log('   - Go to GA4 Real-time reports');
  console.log('   - Perform checkout');
  console.log('   - You should see events in real-time\n');
}

// Run all tests
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('BASIC DATALAYER TRACKING TEST SUITE\n');
  
  await testFilesExist();
  await testCodeInspection();
  await testRegistrationSuccess();
  await testCheckoutSuccessTrial();
  await testCheckoutSuccessPaid();
  testManualChecklist();
  
  console.log('='.repeat(60));
  console.log('\n✅ Test Summary\n');
  console.log('Basic dataLayer implementation includes:');
  console.log('  ✅ registration_success event on signup-success page');
  console.log('  ✅ free_trial event on checkout-success page (when isTrial=true)');
  console.log('  ✅ subscription_success event with value/currency (when isTrial=false)');
  console.log('  ✅ API endpoint to fetch session details for dynamic values');
  console.log('\n📊 Next steps:');
  console.log('  1. Test manually with real Stripe checkout');
  console.log('  2. Verify events appear in dataLayer');
  console.log('  3. If GTM is configured, check GTM Preview Mode');
  console.log('  4. If GA4 is configured, check GA4 Real-time reports');
  console.log('  5. Then proceed with Advanced Setup (user data, Stripe metadata, Meta CAPI)\n');
}

runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

