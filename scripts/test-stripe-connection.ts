import { config } from 'dotenv';
import Stripe from 'stripe';

config({ path: '.env.local' });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

async function testStripeConnection() {
  console.log('=== Testing Stripe API Connection ===\n');
  
  // Check if keys are set
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
    process.exit(1);
  }
  
  if (!stripePublishableKey) {
    console.warn('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
  } else {
    console.log('✓ Stripe Publishable Key found');
    console.log(`  Key starts with: ${stripePublishableKey.substring(0, 12)}...`);
    console.log(`  Key type: ${stripePublishableKey.startsWith('pk_test_') ? 'TEST' : stripePublishableKey.startsWith('pk_live_') ? 'LIVE' : 'UNKNOWN'}\n`);
  }
  
  console.log('✓ Stripe Secret Key found');
  console.log(`  Key starts with: ${stripeSecretKey.substring(0, 12)}...`);
  console.log(`  Key type: ${stripeSecretKey.startsWith('sk_test_') ? 'TEST' : stripeSecretKey.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN'}\n`);
  
  // Initialize Stripe
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia',
  });
  
  console.log('Attempting to connect to Stripe API...\n');
  
  try {
    // Test 1: Retrieve account information (simple API call)
    console.log('Test 1: Retrieving account information...');
    const account = await stripe.accounts.retrieve();
    console.log('✓ Connection successful!');
    console.log(`  Account ID: ${account.id}`);
    console.log(`  Country: ${account.country || 'N/A'}`);
    console.log(`  Type: ${account.type || 'N/A'}`);
    console.log(`  Charges enabled: ${account.charges_enabled ? 'Yes' : 'No'}`);
    console.log(`  Payouts enabled: ${account.payouts_enabled ? 'Yes' : 'No'}\n`);
    
    // Test 2: List products (verify we can read data)
    console.log('Test 2: Listing products...');
    const products = await stripe.products.list({ limit: 5 });
    console.log(`✓ Successfully retrieved ${products.data.length} product(s)`);
    if (products.data.length > 0) {
      console.log('  Sample products:');
      products.data.forEach((product, index) => {
        console.log(`    ${index + 1}. ${product.name} (ID: ${product.id})`);
      });
    }
    console.log('');
    
    // Test 3: List prices (verify pricing data access)
    console.log('Test 3: Listing prices...');
    const prices = await stripe.prices.list({ limit: 5 });
    console.log(`✓ Successfully retrieved ${prices.data.length} price(s)`);
    if (prices.data.length > 0) {
      console.log('  Sample prices:');
      prices.data.forEach((price, index) => {
        const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
        console.log(`    ${index + 1}. $${amount} ${price.currency.toUpperCase()} (ID: ${price.id})`);
      });
    }
    console.log('');
    
    // Test 4: Check environment variable price IDs if set
    const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;
    const lifetimePriceId = process.env.STRIPE_PRICE_ID_LIFETIME;
    
    if (monthlyPriceId || annualPriceId || lifetimePriceId) {
      console.log('Test 4: Verifying configured price IDs...');
      
      const priceIds = [
        { name: 'Monthly', id: monthlyPriceId },
        { name: 'Annual', id: annualPriceId },
        { name: 'Lifetime', id: lifetimePriceId },
      ].filter(p => p.id);
      
      for (const priceInfo of priceIds) {
        try {
          const price = await stripe.prices.retrieve(priceInfo.id!);
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
          console.log(`  ✓ ${priceInfo.name} Price ID is valid: $${amount} ${price.currency.toUpperCase()}`);
        } catch (error: any) {
          console.log(`  ✗ ${priceInfo.name} Price ID is invalid: ${error.message}`);
        }
      }
      console.log('');
    }
    
    console.log('========================================');
    console.log('✅ All Stripe API tests passed!');
    console.log('✅ API connection is working correctly');
    console.log('========================================\n');
    
  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ Stripe API connection failed!');
    console.error('========================================\n');
    console.error('Error details:');
    console.error(`  Type: ${error.type || 'Unknown'}`);
    console.error(`  Message: ${error.message || 'Unknown error'}`);
    
    if (error.code) {
      console.error(`  Code: ${error.code}`);
    }
    
    if (error.statusCode) {
      console.error(`  Status Code: ${error.statusCode}`);
    }
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n⚠️  This appears to be an authentication error.');
      console.error('   Please check that your STRIPE_SECRET_KEY is correct.');
    } else if (error.type === 'StripeAPIError') {
      console.error('\n⚠️  This appears to be an API error.');
      console.error('   The API key may be valid but there might be an issue with the request.');
    }
    
    process.exit(1);
  }
}

testStripeConnection().catch(console.error);

