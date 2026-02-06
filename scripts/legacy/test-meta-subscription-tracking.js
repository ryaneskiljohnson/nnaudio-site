/**
 * Test Script for Meta Subscription Tracking
 * 
 * Tests the Meta conversion tracking for:
 * 1. Trial initiations (Subscribe event)
 * 2. Paid subscriptions (Purchase event)
 * 
 * Usage:
 *   node test-meta-subscription-tracking.js
 */

require('dotenv').config({ path: '.env.local' });

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const META_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test event code for Meta Events Manager (optional)
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || undefined;

console.log('🧪 Testing Meta Subscription Tracking\n');
console.log('Configuration:');
console.log(`  Pixel ID: ${META_PIXEL_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`  API Token: ${META_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`  Base URL: ${BASE_URL}`);
console.log(`  Test Event Code: ${TEST_EVENT_CODE || 'Not set'}\n`);

if (!META_PIXEL_ID || !META_TOKEN) {
  console.error('❌ Missing required environment variables!');
  console.error('   Set NEXT_PUBLIC_META_PIXEL_ID and META_CONVERSIONS_API_TOKEN in .env.local');
  process.exit(1);
}

/**
 * Test tracking a trial initiation
 */
async function testTrialInitiation() {
  console.log('📝 Test 1: Trial Initiation (Subscribe Event)');
  console.log('─'.repeat(50));
  
  const testData = {
    eventName: 'Subscribe',
    userData: {
      email: 'test-trial@example.com',
      userId: 'test-user-123',
      clientIp: '127.0.0.1',
      clientUserAgent: 'Test-Script/1.0',
    },
    customData: {
      subscription_type: 'monthly',
      trial_days: 7,
      subscription_id: 'sub_test_trial_123',
      price_id: 'price_test_monthly',
      currency: 'usd',
      value: 9.99,
    },
    eventId: 'trial_sub_test_trial_123',
    testEventCode: TEST_EVENT_CODE,
    url: BASE_URL,
  };

  try {
    const response = await fetch(`${BASE_URL}/api/meta/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Trial initiation tracked successfully!');
      console.log(`   Event ID: ${testData.eventId}`);
      console.log(`   Subscription Type: ${testData.customData.subscription_type}`);
      console.log(`   Trial Days: ${testData.customData.trial_days}`);
      if (result.facebookId) {
        console.log(`   Facebook Event ID: ${result.facebookId}`);
      }
    } else {
      console.error('❌ Failed to track trial initiation:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Error testing trial initiation:');
    console.error(`   ${error.message}`);
  }
  
  console.log('');
}

/**
 * Test tracking a paid subscription (monthly)
 */
async function testPaidSubscriptionMonthly() {
  console.log('📝 Test 2: Paid Subscription - Monthly (Purchase Event)');
  console.log('─'.repeat(50));
  
  const testData = {
    eventName: 'Purchase',
    userData: {
      email: 'test-paid@example.com',
      userId: 'test-user-456',
      clientIp: '127.0.0.1',
      clientUserAgent: 'Test-Script/1.0',
    },
    customData: {
      subscription_type: 'monthly',
      subscription_id: 'sub_test_monthly_123',
      price_id: 'price_test_monthly',
      currency: 'USD',
      value: 9.99,
      payment_method: 'card',
    },
    eventId: 'subscription_paid_charge_monthly_123',
    testEventCode: TEST_EVENT_CODE,
    url: BASE_URL,
  };

  try {
    const response = await fetch(`${BASE_URL}/api/meta/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Monthly subscription tracked successfully!');
      console.log(`   Event ID: ${testData.eventId}`);
      console.log(`   Subscription Type: ${testData.customData.subscription_type}`);
      console.log(`   Value: $${testData.customData.value} ${testData.customData.currency}`);
      if (result.facebookId) {
        console.log(`   Facebook Event ID: ${result.facebookId}`);
      }
    } else {
      console.error('❌ Failed to track monthly subscription:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Error testing monthly subscription:');
    console.error(`   ${error.message}`);
  }
  
  console.log('');
}

/**
 * Test tracking a paid subscription (annual)
 */
async function testPaidSubscriptionAnnual() {
  console.log('📝 Test 3: Paid Subscription - Annual (Purchase Event)');
  console.log('─'.repeat(50));
  
  const testData = {
    eventName: 'Purchase',
    userData: {
      email: 'test-annual@example.com',
      userId: 'test-user-789',
      clientIp: '127.0.0.1',
      clientUserAgent: 'Test-Script/1.0',
    },
    customData: {
      subscription_type: 'annual',
      subscription_id: 'sub_test_annual_123',
      price_id: 'price_test_annual',
      currency: 'USD',
      value: 99.99,
      payment_method: 'card',
    },
    eventId: 'subscription_paid_charge_annual_123',
    testEventCode: TEST_EVENT_CODE,
    url: BASE_URL,
  };

  try {
    const response = await fetch(`${BASE_URL}/api/meta/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Annual subscription tracked successfully!');
      console.log(`   Event ID: ${testData.eventId}`);
      console.log(`   Subscription Type: ${testData.customData.subscription_type}`);
      console.log(`   Value: $${testData.customData.value} ${testData.customData.currency}`);
      if (result.facebookId) {
        console.log(`   Facebook Event ID: ${result.facebookId}`);
      }
    } else {
      console.error('❌ Failed to track annual subscription:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Error testing annual subscription:');
    console.error(`   ${error.message}`);
  }
  
  console.log('');
}

/**
 * Check Supabase logs
 */
async function checkSupabaseLogs() {
  console.log('📊 Checking Supabase Logs');
  console.log('─'.repeat(50));
  console.log('To check logs in Supabase, run:');
  console.log('');
  console.log('  SELECT * FROM meta_conversion_events');
  console.log('  ORDER BY created_at DESC');
  console.log('  LIMIT 10;');
  console.log('');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('Starting tests...\n');
  
  // Wait a bit between tests to avoid rate limiting
  await testTrialInitiation();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testPaidSubscriptionMonthly();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testPaidSubscriptionAnnual();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await checkSupabaseLogs();
  
  console.log('✅ All tests completed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Check Meta Events Manager: https://business.facebook.com/events_manager2');
  console.log('2. Look for events in "Test Events" tab (if using testEventCode)');
  console.log('3. Check Supabase meta_conversion_events table for logs');
  console.log('4. Verify events appear within 5-10 seconds in Meta');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

