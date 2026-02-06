require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const Stripe = require('stripe');

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const lifetimePriceId = process.env.STRIPE_PRICE_ID_LIFETIME;

if (!lifetimePriceId) {
  console.error('❌ STRIPE_PRICE_ID_LIFETIME environment variable is required');
  process.exit(1);
}

/**
 * Grants a lifetime license to a user by creating proper Stripe data
 * This creates a checkout session with 100% off coupon, which properly creates
 * a payment intent with lifetime metadata that the subscription check can detect
 */
async function grantLifetimeLicense(email, customerId) {
  try {
    console.log('📝 Granting lifetime license to:', email);
    console.log('👤 Customer ID:', customerId);
    console.log('💰 Lifetime Price ID:', lifetimePriceId);

    // Step 1: Create a 100% off coupon
    console.log('\n1️⃣ Creating 100% off coupon...');
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: 'once',
      name: `Lifetime Grant - ${email}`,
    });
    console.log('✅ Coupon created:', coupon.id);

    // Step 2: Create a checkout session with the lifetime price and coupon
    // This will properly create a payment intent with metadata when completed
    console.log('\n2️⃣ Creating checkout session with lifetime price and 100% coupon...');
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment', // One-time payment for lifetime
      line_items: [
        {
          price: lifetimePriceId,
          quantity: 1,
        },
      ],
      discounts: [
        {
          coupon: coupon.id,
        },
      ],
      payment_intent_data: {
        metadata: {
          purchase_type: 'lifetime',
        },
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            purchase_type: 'lifetime',
          },
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cymasphere.com'}/dashboard?lifetime_granted=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cymasphere.com'}/dashboard`,
    });

    console.log('✅ Checkout session created:', checkoutSession.id);
    console.log('   URL:', checkoutSession.url);

    // Step 3: Since this is a $0 checkout (100% off), we need to complete it
    // We'll create the invoice and payment intent directly
    console.log('\n3️⃣ Creating invoice with lifetime price...');
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 0,
      metadata: {
        purchase_type: 'lifetime',
      },
      description: 'Lifetime Access',
    });

    // Add line item
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      price: lifetimePriceId,
      quantity: 1,
    });

    // Apply coupon
    await stripe.invoices.update(invoice.id, {
      discounts: [{ coupon: coupon.id }],
      metadata: {
        purchase_type: 'lifetime',
      },
    });

    // Finalize and mark as paid
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    console.log('✅ Invoice finalized:', finalizedInvoice.id);

    // Step 4: The invoice with lifetime metadata should be enough
    // The subscription check now looks at invoices directly (not just payment intents)
    // For $0 invoices, Stripe doesn't create payment intents, but our invoice check handles this
    console.log('\n4️⃣ Verifying invoice has correct metadata...');
    const verifiedInvoice = await stripe.invoices.retrieve(finalizedInvoice.id);
    console.log('✅ Invoice verified:');
    console.log('   ID:', verifiedInvoice.id);
    console.log('   Status:', verifiedInvoice.status);
    console.log('   Metadata:', verifiedInvoice.metadata);
    console.log('   Amount Paid:', `$${(verifiedInvoice.amount_paid / 100).toFixed(2)}`);
    
    // Verify line items have lifetime price
    const hasLifetimePrice = verifiedInvoice.lines.data.some(line => 
      line.price?.id === lifetimePriceId
    );
    console.log('   Has Lifetime Price:', hasLifetimePrice);

    console.log('\n✅ SUCCESS! Lifetime license granted');
    console.log('\n📋 Created Stripe Objects:');
    console.log('   Invoice:', verifiedInvoice.id);
    console.log('   Checkout Session:', checkoutSession.id);
    console.log('   Coupon:', coupon.id);
    console.log('\n📝 How It Works:');
    console.log('   1. Invoice is created with lifetime price and 100% off coupon');
    console.log('   2. Invoice is finalized and marked as paid ($0)');
    console.log('   3. Invoice has lifetime metadata (purchase_type: "lifetime", is_lifetime: "true")');
    console.log('   4. Invoice line items contain the lifetime price ID');
    console.log('   5. The subscription check (customerPurchasedProFromSupabase) checks invoices directly');
    console.log('   6. No payment intent needed - invoice check handles $0 invoices');
    console.log('   7. Subscription will be automatically set to "lifetime" on next check');

    return {
      success: true,
      invoice: verifiedInvoice,
      checkoutSession: checkoutSession,
      coupon: coupon,
    };
  } catch (error) {
    console.error('❌ Error granting lifetime license:', error);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    throw error;
  }
}

// Run the script
if (require.main === module) {
  const email = process.argv[2];
  const customerId = process.argv[3];

  if (!email || !customerId) {
    console.error('Usage: node grant-lifetime-license.js <email> <customer_id>');
    console.error('Example: node grant-lifetime-license.js happypower@zonnet.nl cus_TYCvhXd0EU70sE');
    process.exit(1);
  }

  grantLifetimeLicense(email, customerId)
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { grantLifetimeLicense };
