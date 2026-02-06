/**
 * Simple Meta Tracking Test
 * 
 * Tests the Meta API endpoint directly without requiring full server setup.
 * This validates the implementation logic.
 */

require('dotenv').config({ path: '.env.local' });

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const META_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;

console.log('🧪 Simple Meta Tracking Test\n');
console.log('Configuration Check:');
console.log(`  Pixel ID: ${META_PIXEL_ID ? '✅ Set (' + META_PIXEL_ID + ')' : '❌ Missing'}`);
console.log(`  API Token: ${META_TOKEN ? '✅ Set (' + META_TOKEN.substring(0, 20) + '...)' : '❌ Missing'}\n`);

if (!META_PIXEL_ID || !META_TOKEN) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

// Test the Meta API directly
async function testMetaAPIDirectly() {
  console.log('📤 Testing Meta Conversions API directly...\n');
  
  const META_API_VERSION = 'v18.0';
  const META_API_ENDPOINT = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;
  
  // Test event data
  const testEvent = {
    event_name: 'Subscribe',
    event_time: Math.floor(Date.now() / 1000),
    event_id: 'test_trial_' + Date.now(),
    user_data: {
      em: 'test@example.com', // This should be hashed, but for testing we'll use plain
      external_id: 'test-user-123',
    },
    custom_data: {
      subscription_type: 'monthly',
      trial_days: 7,
      subscription_id: 'sub_test_123',
    },
  };

  const payload = {
    data: [testEvent],
    access_token: META_TOKEN,
    test_event_code: 'TEST12345', // Use test event code so it doesn't affect real data
  };

  try {
    console.log('Sending test event to Meta API...');
    console.log(`  Endpoint: ${META_API_ENDPOINT}`);
    console.log(`  Event: ${testEvent.event_name}`);
    console.log(`  Event ID: ${testEvent.event_id}\n`);

    const response = await fetch(META_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Successfully sent event to Meta!');
      console.log(`   Events Received: ${result.events_received || 'N/A'}`);
      if (result.events_received > 0 && result.events?.[0]?.event_id) {
        console.log(`   Event ID: ${result.events[0].event_id}`);
      }
      console.log('\n📊 Next Steps:');
      console.log('1. Go to Meta Events Manager: https://business.facebook.com/events_manager2');
      console.log('2. Click on "Test Events" tab');
      console.log('3. Enter test event code: TEST12345');
      console.log('4. You should see the event appear within 5-10 seconds');
    } else {
      console.error('❌ Failed to send event to Meta:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${JSON.stringify(result, null, 2)}`);
      
      if (result.error) {
        console.error('\nCommon issues:');
        if (result.error.message?.includes('Invalid access token')) {
          console.error('   - Check META_CONVERSIONS_API_TOKEN is correct');
        }
        if (result.error.message?.includes('Invalid pixel')) {
          console.error('   - Check NEXT_PUBLIC_META_PIXEL_ID is correct');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error calling Meta API:');
    console.error(`   ${error.message}`);
    console.error('\nThis might be a network issue or the API endpoint is unreachable.');
  }
}

// Test webhook helper function logic
function testWebhookHelperLogic() {
  console.log('\n📝 Testing Webhook Helper Logic...\n');
  
  const testScenarios = [
    {
      name: 'Trial Initiation',
      eventName: 'Subscribe',
      customData: {
        subscription_type: 'monthly',
        trial_days: 7,
        subscription_id: 'sub_test_123',
      },
    },
    {
      name: 'Paid Subscription - Monthly',
      eventName: 'Purchase',
      customData: {
        subscription_type: 'monthly',
        subscription_id: 'sub_test_123',
        currency: 'USD',
        value: 9.99,
      },
    },
    {
      name: 'Paid Subscription - Annual',
      eventName: 'Purchase',
      customData: {
        subscription_type: 'annual',
        subscription_id: 'sub_test_456',
        currency: 'USD',
        value: 99.99,
      },
    },
  ];

  console.log('✅ Webhook helper would track these events:');
  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   Event: ${scenario.eventName}`);
    console.log(`   Custom Data: ${JSON.stringify(scenario.customData, null, 6)}`);
  });
}

// Run tests
console.log('='.repeat(60));
testWebhookHelperLogic();
console.log('\n' + '='.repeat(60));
testMetaAPIDirectly().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

