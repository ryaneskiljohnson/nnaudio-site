import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

async function listStripePrices() {
  try {
    console.log('=== Listing All Stripe Prices ===\n');

    // List all prices
    const prices = await stripe.prices.list({
      limit: 100,
      expand: ['data.product'],
    });

    console.log(`Found ${prices.data.length} price(s):\n`);

    // Group by product
    const pricesByProduct = new Map<string, any[]>();
    
    prices.data.forEach((price) => {
      const product = price.product as Stripe.Product;
      const productName = product?.name || 'Unknown Product';
      
      if (!pricesByProduct.has(productName)) {
        pricesByProduct.set(productName, []);
      }
      pricesByProduct.get(productName)!.push(price);
    });

    // Display grouped by product
    pricesByProduct.forEach((productPrices, productName) => {
      console.log(`\n📦 ${productName}:`);
      productPrices.forEach((price) => {
        const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'N/A';
        const interval = price.recurring?.interval || 'one-time';
        const currency = price.currency.toUpperCase();
        
        console.log(`  • ${amount} ${currency} (${interval})`);
        console.log(`    ID: ${price.id}`);
        console.log(`    Active: ${price.active ? 'Yes' : 'No'}`);
        if (price.recurring) {
          console.log(`    Interval: ${price.recurring.interval}`);
          console.log(`    Interval Count: ${price.recurring.interval_count}`);
        }
        console.log('');
      });
    });

    // Find prices that match common patterns
    console.log('\n=== Suggested Price IDs ===\n');
    
    const monthlyPrices = prices.data.filter(
      (p) => p.recurring?.interval === 'month' && p.active
    );
    const annualPrices = prices.data.filter(
      (p) => p.recurring?.interval === 'year' && p.active
    );
    const oneTimePrices = prices.data.filter(
      (p) => !p.recurring && p.active
    );

    if (monthlyPrices.length > 0) {
      console.log('Monthly (recurring) prices:');
      monthlyPrices.forEach((p) => {
        const amount = p.unit_amount ? `$${(p.unit_amount / 100).toFixed(2)}` : 'N/A';
        console.log(`  STRIPE_PRICE_ID_MONTHLY=${p.id}  # ${amount}`);
      });
      console.log('');
    }

    if (annualPrices.length > 0) {
      console.log('Annual (recurring) prices:');
      annualPrices.forEach((p) => {
        const amount = p.unit_amount ? `$${(p.unit_amount / 100).toFixed(2)}` : 'N/A';
        console.log(`  STRIPE_PRICE_ID_ANNUAL=${p.id}  # ${amount}`);
      });
      console.log('');
    }

    if (oneTimePrices.length > 0) {
      console.log('Lifetime (one-time) prices:');
      oneTimePrices.forEach((p) => {
        const amount = p.unit_amount ? `$${(p.unit_amount / 100).toFixed(2)}` : 'N/A';
        console.log(`  STRIPE_PRICE_ID_LIFETIME=${p.id}  # ${amount}`);
      });
      console.log('');
    }

  } catch (error: any) {
    console.error('Error listing prices:', error.message);
    process.exit(1);
  }
}

listStripePrices();

